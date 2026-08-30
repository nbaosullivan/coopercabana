'use server';

import { revalidatePath } from 'next/cache';
import { getSessionAttendeeId } from '@/lib/session';
import * as db from '@/lib/db';
import * as gamesDb from '@/lib/games/db';
import { addLetter, isEliminated, skateChasers } from '@/lib/games/skate';
import {
  stripPin,
  Game,
  GameSnapshot,
  GameAssignment,
  AssassinPlayerState,
  SkateRoundPayload,
  SkatePlayerState,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// Read path for the games engine. `getGameSnapshot` is the security-critical
// function in this whole feature: it is the only place a player's client
// ever sees game state, and it must never leak a hunter's identity to their
// target before resolution. See the redaction rules inline below.
// ---------------------------------------------------------------------------

async function buildSnapshot(game: Game, meId: string): Promise<GameSnapshot> {
  const [players, currentRound, events] = await Promise.all([
    gamesDb.getGamePlayers(game.id),
    gamesDb.getCurrentRound(game.id),
    gamesDb.getEvents(game.id, 30),
  ]);

  const attendees = await db.getAttendees();
  const attendeeById = new Map(attendees.map((a) => [a.id, a]));

  const playerRows = players.map((p) => ({
    attendee: stripPin(attendeeById.get(p.attendee_id)!),
    state: p.state,
    is_out: p.is_out,
  }));

  let roundAssignments: GameAssignment[] = [];
  if (currentRound) {
    roundAssignments = await gamesDb.getAssignmentsForRound(currentRound.id);
  }

  // Rule 2: myAssignment — the caller's own assignment in the current round,
  // full payload (they are the actor, entitled to know their own mission).
  const myAssignment = roundAssignments.find((a) => a.actor_id === meId) ?? null;

  // Rule 3: publicAssignments — visibility='public' only, never private ones.
  const publicAssignments = roundAssignments.filter((a) => a.visibility === 'public');

  // Rule 4: awaitingMyVerdict — assignments where I am the arbiter and the
  // claim is pending. The target must NOT learn who was hunting them until
  // resolution, so actor_id (the hunter) and any hunter-identifying field are
  // stripped from what is returned. Only action/location/claim_note/claimed_at
  // survive — the minimum needed to judge whether it happened.
  const awaitingMyVerdict: GameAssignment[] = roundAssignments
    .filter((a) => a.arbiter_id === meId && a.status === 'claimed')
    .map((a) => ({
      ...a,
      actor_id: '', // redacted — never reveal the hunter before resolution
      payload: {
        action: a.payload.action,
        location: a.payload.location,
      },
    }));

  // Rule 5: feed — already public-only at the db layer.
  const feed = events;

  // Rule 6: hasUnseen.
  const hasUnseen =
    myAssignment !== null && myAssignment.seen_at === null && myAssignment.status === 'active';

  return {
    game,
    players: playerRows,
    currentRound,
    myAssignment,
    awaitingMyVerdict,
    publicAssignments,
    feed,
    hasUnseen,
  };
}

export async function getGameSnapshot(gameId: string): Promise<GameSnapshot | null> {
  const meId = getSessionAttendeeId();
  if (!meId) return null;

  const game = await gamesDb.getGameById(gameId);
  if (!game) return null;

  return buildSnapshot(game, meId);
}

export async function getActiveGameSnapshots(): Promise<GameSnapshot[]> {
  const meId = getSessionAttendeeId();
  if (!meId) return [];

  const games = await gamesDb.getActiveGames();
  return Promise.all(games.map((game) => buildSnapshot(game, meId)));
}

export async function markMissionSeen(assignmentId: string): Promise<void> {
  const meId = getSessionAttendeeId();
  if (!meId) return;

  const assignment = await gamesDb.getAssignmentById(assignmentId);
  if (!assignment || assignment.actor_id !== meId) return;

  await gamesDb.markAssignmentSeen(assignmentId);
  revalidatePath('/tasks');
}

// ---------------------------------------------------------------------------
// Player write actions. Every action derives the actor from the session
// cookie via getSessionAttendeeId() — none accept an actorId from the client.
// ---------------------------------------------------------------------------

/** Assassin: "I got them." Moves active -> claimed, notifies the target. */
export async function claimAssignment(assignmentId: string, note?: string): Promise<void> {
  const meId = getSessionAttendeeId();
  if (!meId) throw new Error('Not signed in');

  const assignment = await gamesDb.getAssignmentById(assignmentId);
  if (!assignment) throw new Error('Mission not found');
  if (assignment.actor_id !== meId) throw new Error('Not your mission');
  if (assignment.status !== 'active') throw new Error('Mission is not active');

  await gamesDb.updateAssignment(assignmentId, {
    status: 'claimed',
    claimed_at: new Date().toISOString(),
    claim_note: note ?? null,
  });

  // Not public — a "someone claimed something" line would tip off the
  // target before they get to judge it.
  await gamesDb.logEvent({
    game_id: assignment.game_id,
    round_id: assignment.round_id,
    assignment_id: assignment.id,
    actor_id: meId,
    type: 'claimed',
    is_public: false,
  });

  revalidatePath('/tasks');
}

/** Arbiter verdict. approve=true -> succeeded, false -> disputed. */
export async function resolveClaim(assignmentId: string, approve: boolean): Promise<void> {
  const meId = getSessionAttendeeId();
  if (!meId) throw new Error('Not signed in');

  const attendee = await db.getAttendeeById(meId);
  const assignment = await gamesDb.getAssignmentById(assignmentId);
  if (!assignment) throw new Error('Mission not found');
  if (assignment.arbiter_id !== meId && !attendee?.is_admin) {
    throw new Error('Not your call to make');
  }
  if (assignment.status !== 'claimed') throw new Error('Mission is not awaiting a verdict');

  if (approve) {
    await gamesDb.updateAssignment(assignmentId, {
      status: 'succeeded',
      resolved_at: new Date().toISOString(),
      resolved_by: meId,
    });

    const player = (await gamesDb.getGamePlayers(assignment.game_id)).find(
      (p) => p.attendee_id === assignment.actor_id
    );
    const currentScore = ((player?.state as AssassinPlayerState | undefined)?.score ?? 0) as number;
    await gamesDb.updatePlayerState(assignment.game_id, assignment.actor_id, {
      score: currentScore + 1,
    });

    const attendees = await db.getAttendees();
    const attendeeById = new Map(attendees.map((a) => [a.id, a]));
    const hunterName = attendeeById.get(assignment.actor_id)?.name ?? 'Someone';

    // Public — this is the reveal. The hunter's identity is safe to share
    // now that the mission has resolved.
    await gamesDb.logEvent({
      game_id: assignment.game_id,
      round_id: assignment.round_id,
      assignment_id: assignment.id,
      actor_id: assignment.actor_id,
      type: 'confirmed',
      payload: {
        hunter: hunterName,
        action: assignment.payload.action,
        location: assignment.payload.location,
      },
      is_public: true,
    });
  } else {
    // A denial is a dispute, not a verdict — it lands in the admin queue
    // rather than failing the mission outright.
    await gamesDb.updateAssignment(assignmentId, { status: 'disputed' });

    await gamesDb.logEvent({
      game_id: assignment.game_id,
      round_id: assignment.round_id,
      assignment_id: assignment.id,
      actor_id: meId,
      type: 'denied',
      is_public: false,
    });
  }

  revalidatePath('/tasks');
}

/** SKATE phase 1: a player calls a set. Opens a round in 'setting' phase. */
export async function callSkateSet(gameId: string, challenge: string): Promise<void> {
  const meId = getSessionAttendeeId();
  if (!meId) throw new Error('Not signed in');

  const game = await gamesDb.getGameById(gameId);
  if (!game || game.kind !== 'skate' || game.status !== 'active') {
    throw new Error('Game is not active');
  }

  const players = await gamesDb.getGamePlayers(gameId);
  const me = players.find((p) => p.attendee_id === meId);
  if (!me || me.is_out) throw new Error('You are out of this game');

  const openRound = await gamesDb.getCurrentRound(gameId);
  if (openRound && openRound.status === 'open') {
    throw new Error('A set is already in progress');
  }

  const rounds = await gamesDb.getRounds(gameId);
  const nextNumber = rounds.length + 1;

  const payload: SkateRoundPayload = {
    setter_id: meId,
    challenge,
    phase: 'setting',
    setter_landed: null,
  };
  const round = await gamesDb.createRound(gameId, nextNumber, toRoundPayloadRecord(payload));

  const attendee = await db.getAttendeeById(meId);
  await gamesDb.logEvent({
    game_id: gameId,
    round_id: round.id,
    actor_id: meId,
    type: 'set_called',
    payload: { setter: attendee?.name ?? 'Someone', challenge },
    is_public: true,
  });

  revalidatePath('/tasks');
}

/** SKATE phase 1 -> 2: the setter reports whether they landed their own set. */
export async function reportSetterAttempt(roundId: string, landed: boolean): Promise<void> {
  const meId = getSessionAttendeeId();
  if (!meId) throw new Error('Not signed in');

  const round = await gamesDb.getRoundById(roundId);
  if (!round) throw new Error('Round not found');
  const payload = round.payload as unknown as SkateRoundPayload;

  const attendee = await db.getAttendeeById(meId);
  if (payload.setter_id !== meId && !attendee?.is_admin) {
    throw new Error('Only the setter can report this');
  }
  if (round.status !== 'open' || payload.phase !== 'setting') {
    throw new Error('This round is not awaiting a set attempt');
  }

  const attendees = await db.getAttendees();
  const attendeeById = new Map(attendees.map((a) => [a.id, a]));
  const setterName = attendeeById.get(payload.setter_id)?.name ?? 'The setter';

  if (landed) {
    const nextPayload: SkateRoundPayload = { ...payload, phase: 'chasing', setter_landed: true };
    await gamesDb.updateRoundPayload(roundId, toRoundPayloadRecord(nextPayload));

    const players = await gamesDb.getGamePlayers(round.game_id);
    const chaserIds = skateChasers(
      players.map((p) => ({ attendeeId: p.attendee_id, isOut: p.is_out })),
      payload.setter_id
    );

    if (chaserIds.length > 0) {
      await gamesDb.createAssignments(
        chaserIds.map((actorId) => ({
          game_id: round.game_id,
          round_id: roundId,
          actor_id: actorId,
          arbiter_id: payload.setter_id,
          payload: { challenge: payload.challenge },
          visibility: 'public' as const,
          status: 'active' as const,
        }))
      );
    }

    await gamesDb.logEvent({
      game_id: round.game_id,
      round_id: roundId,
      actor_id: meId,
      type: 'round_opened',
      payload: { setter: setterName, challenge: payload.challenge },
      is_public: true,
    });
  } else {
    await gamesDb.closeRound(roundId);
    const nextPayload: SkateRoundPayload = { ...payload, setter_landed: false };
    await gamesDb.updateRoundPayload(roundId, toRoundPayloadRecord(nextPayload));

    // Nobody collects a letter, including the setter. No addLetter call here.
    await gamesDb.logEvent({
      game_id: round.game_id,
      round_id: roundId,
      actor_id: meId,
      type: 'set_missed',
      payload: { setter: setterName, challenge: payload.challenge },
      is_public: true,
    });
  }

  revalidatePath('/tasks');
}

/** SKATE phase 2: "I matched it" / "I ducked it" on your own assignment. */
export async function reportSkateAttempt(assignmentId: string, matched: boolean): Promise<void> {
  const meId = getSessionAttendeeId();
  if (!meId) throw new Error('Not signed in');

  const assignment = await gamesDb.getAssignmentById(assignmentId);
  if (!assignment) throw new Error('Assignment not found');
  if (assignment.actor_id !== meId) throw new Error('Not your assignment');
  if (assignment.status !== 'active') throw new Error('Assignment is not active');

  const round = await gamesDb.getRoundById(assignment.round_id);
  if (!round) throw new Error('Round not found');
  const roundPayload = round.payload as unknown as SkateRoundPayload;
  if (roundPayload.phase !== 'chasing') throw new Error('Round is not in the chasing phase');

  const attendees = await db.getAttendees();
  const attendeeById = new Map(attendees.map((a) => [a.id, a]));
  const actorName = attendeeById.get(meId)?.name ?? 'Someone';

  if (matched) {
    await gamesDb.updateAssignment(assignmentId, {
      status: 'succeeded',
      resolved_at: new Date().toISOString(),
      resolved_by: meId,
    });
    await gamesDb.logEvent({
      game_id: assignment.game_id,
      round_id: assignment.round_id,
      assignment_id: assignment.id,
      actor_id: meId,
      type: 'matched',
      payload: { player: actorName, challenge: roundPayload.challenge },
      is_public: true,
    });
  } else {
    await gamesDb.updateAssignment(assignmentId, {
      status: 'failed',
      resolved_at: new Date().toISOString(),
      resolved_by: meId,
    });

    const players = await gamesDb.getGamePlayers(assignment.game_id);
    const me = players.find((p) => p.attendee_id === meId);
    const word =
      ((await gamesDb.getGameById(assignment.game_id))?.config?.word as string | undefined) ??
      'SKATE';
    const currentLetters = ((me?.state as SkatePlayerState | undefined)?.letters ?? '') as string;
    const nextLetters = addLetter(currentLetters, word);
    await gamesDb.updatePlayerState(assignment.game_id, meId, { letters: nextLetters });

    if (isEliminated(nextLetters, word)) {
      await gamesDb.setPlayerOut(assignment.game_id, meId, true);
    }

    await gamesDb.logEvent({
      game_id: assignment.game_id,
      round_id: assignment.round_id,
      assignment_id: assignment.id,
      actor_id: meId,
      type: 'letter_given',
      payload: { player: actorName, letters: nextLetters },
      is_public: true,
    });
  }

  // After every report, close the round automatically once no active
  // assignments remain, then check for a lone survivor.
  const remaining = await gamesDb.getAssignmentsForRound(assignment.round_id);
  const stillActive = remaining.some((a) => a.status === 'active');
  if (!stillActive) {
    await gamesDb.closeRound(assignment.round_id);

    const players = await gamesDb.getGamePlayers(assignment.game_id);
    const survivors = players.filter((p) => !p.is_out);
    if (survivors.length === 1) {
      await gamesDb.updateGameStatus(assignment.game_id, 'ended');
      const winnerName = attendeeById.get(survivors[0].attendee_id)?.name ?? 'Someone';
      await gamesDb.logEvent({
        game_id: assignment.game_id,
        round_id: assignment.round_id,
        actor_id: survivors[0].attendee_id,
        type: 'game_ended',
        payload: { winner: winnerName },
        is_public: true,
      });
    }
  }

  revalidatePath('/tasks');
}

// --- Internal helpers ------------------------------------------------------

function toRoundPayloadRecord(payload: SkateRoundPayload): Record<string, unknown> {
  return { ...payload };
}
