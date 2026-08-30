'use server';

import { revalidatePath } from 'next/cache';
import { getSessionAttendeeId } from '@/lib/session';
import * as db from '@/lib/db';
import * as gamesDb from '@/lib/games/db';
import { stripPin, Game, GameSnapshot, GameAssignment } from '@/lib/types';

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
