'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell, Crown, Shuffle } from 'lucide-react';
import { GameViewProps } from '@/lib/games/registry';
import { SkatePlayerState, SkateRoundPayload } from '@/lib/types';
import { skateStandings, DEFAULT_SKATE_WORD } from '@/lib/games/skate';
import {
  callSkateSet,
  reportSetterAttempt,
  reportSkateAttempt,
  adminOverrideAssignment,
  setPlayerLetters,
  endGame,
} from '@/app/games/actions';

export function SkatePlayerView({ snapshot, me, allAttendees }: GameViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [challenge, setChallenge] = useState('');

  const word = ((snapshot.game.config?.word as string | undefined) ?? DEFAULT_SKATE_WORD).toUpperCase();
  const nameById = new Map(allAttendees.map((a) => [a.id, a.name]));

  const standingsInput = snapshot.players.map((p) => ({
    attendeeId: p.attendee.id,
    name: p.attendee.name,
    letters: ((p.state as unknown as SkatePlayerState).letters ?? '') as string,
  }));
  const standings = skateStandings(standingsInput, word);

  const round = snapshot.currentRound;
  const roundPayload = round?.payload as unknown as SkateRoundPayload | undefined;
  const roundOpen = round?.status === 'open';
  const iAmOut = snapshot.players.find((p) => p.attendee.id === me.id)?.is_out ?? false;

  function handleCallSet() {
    if (!challenge.trim()) return;
    startTransition(async () => {
      await callSkateSet(snapshot.game.id, challenge.trim());
      setChallenge('');
      router.refresh();
    });
  }

  function handleSetterAttempt(landed: boolean) {
    if (!round) return;
    startTransition(async () => {
      await reportSetterAttempt(round.id, landed);
      router.refresh();
    });
  }

  function handleChaserAttempt(matched: boolean) {
    if (!snapshot.myAssignment) return;
    startTransition(async () => {
      await reportSkateAttempt(snapshot.myAssignment!.id, matched);
      router.refresh();
    });
  }

  const iAmSetter = roundPayload?.setter_id === me.id;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-zinc-200">
        <Dumbbell className="h-3.5 w-3.5" /> {snapshot.game.title}
      </h2>

      {/* Letter board */}
      <div className="mb-4 space-y-2">
        {standings.map((row) => (
          <div
            key={row.attendeeId}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
              row.attendeeId === me.id ? 'bg-zinc-950' : ''
            }`}
          >
            <span
              className={`flex items-center gap-1.5 ${
                row.isOut ? 'text-zinc-600 line-through' : 'text-zinc-200'
              }`}
            >
              {row.isWinner && <Crown className="h-3.5 w-3.5 text-amber-400" />}
              {row.name}
            </span>
            <span className="flex gap-0.5 font-mono text-xs tracking-widest">
              {word.split('').map((letter, i) => (
                <span
                  key={i}
                  className={
                    i < row.letters.length
                      ? 'font-bold text-emerald-500'
                      : 'text-zinc-700'
                  }
                >
                  {letter}
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>

      {/* Current set */}
      <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3.5">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Current set
        </p>

        {!roundOpen && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={challenge}
                onChange={(e) => setChallenge(e.target.value)}
                placeholder="Set a challenge (e.g. 30 press-ups)"
                disabled={iAmOut}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 disabled:opacity-50"
              />
            </div>
            <button
              onClick={handleCallSet}
              disabled={isPending || iAmOut || !challenge.trim()}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-cream disabled:opacity-60"
            >
              <Shuffle className="h-3.5 w-3.5" /> Call it
            </button>
          </div>
        )}

        {roundOpen && roundPayload?.phase === 'setting' && iAmSetter && (
          <div>
            <p className="mb-2 text-sm text-zinc-200">
              You called: <span className="font-semibold">{roundPayload.challenge}</span>. Land it
              or the set is void.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleSetterAttempt(true)}
                disabled={isPending}
                className="flex-1 rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-cream disabled:opacity-60"
              >
                Landed it
              </button>
              <button
                onClick={() => handleSetterAttempt(false)}
                disabled={isPending}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 py-2 text-sm font-semibold text-red-400 disabled:opacity-60"
              >
                Missed it
              </button>
            </div>
          </div>
        )}

        {roundOpen && roundPayload?.phase === 'setting' && !iAmSetter && (
          <p className="text-sm text-zinc-400">
            {nameById.get(roundPayload.setter_id) ?? 'Someone'} is going for{' '}
            {roundPayload.challenge}. Wait and see.
          </p>
        )}

        {roundOpen &&
          roundPayload?.phase === 'chasing' &&
          snapshot.myAssignment &&
          snapshot.myAssignment.status === 'active' && (
            <div>
              <p className="mb-2 text-sm text-zinc-200">
                {nameById.get(roundPayload.setter_id) ?? 'Someone'} landed{' '}
                {roundPayload.challenge}. Your turn.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleChaserAttempt(true)}
                  disabled={isPending}
                  className="flex-1 rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-cream disabled:opacity-60"
                >
                  Did it
                </button>
                <button
                  onClick={() => handleChaserAttempt(false)}
                  disabled={isPending}
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 py-2 text-sm font-semibold text-red-400 disabled:opacity-60"
                >
                  Ducked it
                </button>
              </div>
            </div>
          )}

        {roundOpen && roundPayload?.phase === 'chasing' && iAmSetter && (
          <p className="text-sm text-zinc-400">Waiting on the others.</p>
        )}
      </div>

      {/* Feed */}
      {snapshot.feed.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Feed</p>
          <div className="space-y-1.5">
            {snapshot.feed.map((e) => (
              <p key={e.id} className="text-xs text-zinc-500">
                {formatSkateEvent(e.type, e.payload as Record<string, string>)}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatSkateEvent(type: string, payload: Record<string, string>): string {
  switch (type) {
    case 'set_called':
      return `${payload.setter} is going for ${payload.challenge}.`;
    case 'round_opened':
      return `${payload.setter} landed it. Everyone else: ${payload.challenge} or take a letter.`;
    case 'set_missed':
      return `${payload.setter} blew his own set. No letters.`;
    case 'matched':
      return `${payload.player} matched ${payload.challenge}.`;
    case 'letter_given':
      return `${payload.player} ducked it. Letters: ${payload.letters}.`;
    case 'game_started':
      return `${payload.title} has started.`;
    case 'game_ended':
      return `Game over. Winner: ${payload.winner ?? payload.title}.`;
    case 'admin_override':
      return `Admin override: marked ${payload.status}.`;
    default:
      return type;
  }
}

export function SkateAdminView({ snapshot, allAttendees }: GameViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleOverride(assignmentId: string, status: 'succeeded' | 'failed') {
    startTransition(async () => {
      await adminOverrideAssignment(assignmentId, status);
      router.refresh();
    });
  }

  function handleAdjustLetters(attendeeId: string, letters: string) {
    startTransition(async () => {
      await setPlayerLetters(snapshot.game.id, attendeeId, letters);
      router.refresh();
    });
  }

  function handleEndGame() {
    startTransition(async () => {
      await endGame(snapshot.game.id);
      router.refresh();
    });
  }

  const nameById = new Map(allAttendees.map((a) => [a.id, a.name]));

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="mb-4 text-sm font-semibold text-zinc-200">SKATE admin</h2>

      <div className="mb-4 space-y-2">
        {snapshot.publicAssignments.map((a) => (
          <div key={a.id} className="flex items-center justify-between text-sm">
            <span className="text-zinc-300">{nameById.get(a.actor_id) ?? 'Unknown'}</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleOverride(a.id, 'succeeded')}
                disabled={isPending}
                className="rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-cream disabled:opacity-60"
              >
                Force pass
              </button>
              <button
                onClick={() => handleOverride(a.id, 'failed')}
                disabled={isPending}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs font-semibold text-red-400 disabled:opacity-60"
              >
                Force letter
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Adjust letters
        </p>
        {snapshot.players.map((p) => {
          const letters = ((p.state as unknown as SkatePlayerState).letters ?? '') as string;
          return (
            <div key={p.attendee.id} className="flex items-center justify-between text-sm">
              <span className="text-zinc-300">{p.attendee.name}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-zinc-500">{letters || '-'}</span>
                <button
                  onClick={() => handleAdjustLetters(p.attendee.id, letters.slice(0, -1))}
                  disabled={isPending || letters.length === 0}
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-300 disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={handleEndGame}
        disabled={isPending}
        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 py-2.5 text-sm font-semibold text-red-400 disabled:opacity-60"
      >
        End game
      </button>
    </div>
  );
}
