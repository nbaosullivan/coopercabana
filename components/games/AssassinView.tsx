'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Crosshair, Send, CheckCircle2, XCircle, HelpCircle, ShieldAlert } from 'lucide-react';
import { GameViewProps } from '@/lib/games/registry';
import { AssassinPayload, AssassinPlayerState } from '@/lib/types';
import {
  claimAssignment,
  resolveClaim,
  dealAssassinRound,
  adminOverrideAssignment,
  endGame,
  getAdminGameView,
  AdminGameView,
} from '@/app/games/actions';
import MissionBriefing from './MissionBriefing';

export function AssassinPlayerView({ snapshot, me, allAttendees }: GameViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState('');

  const nameById = new Map(allAttendees.map((a) => [a.id, a.name]));
  const myAssignment = snapshot.myAssignment;
  const myPayload = myAssignment?.payload as unknown as AssassinPayload | undefined;

  function handleClaim() {
    if (!myAssignment) return;
    startTransition(async () => {
      await claimAssignment(myAssignment.id, note || undefined);
      setNote('');
      router.refresh();
    });
  }

  function handleVerdict(assignmentId: string, approve: boolean) {
    startTransition(async () => {
      await resolveClaim(assignmentId, approve);
      router.refresh();
    });
  }

  const standings = [...snapshot.players].sort((a, b) => {
    const aScore = (a.state as unknown as AssassinPlayerState).score ?? 0;
    const bScore = (b.state as unknown as AssassinPlayerState).score ?? 0;
    return bScore - aScore;
  });

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-zinc-200">
        <Crosshair className="h-3.5 w-3.5" /> {snapshot.game.title}
      </h2>

      {snapshot.hasUnseen && myAssignment && myPayload && (
        <MissionBriefing
          assignment={myAssignment}
          targetName={nameById.get(myPayload.target_id) ?? 'Unknown'}
        />
      )}

      {/* Verdict prompts — never reveal who claimed it */}
      {snapshot.awaitingMyVerdict.length > 0 && (
        <div className="mb-4 space-y-3">
          {snapshot.awaitingMyVerdict.map((a) => {
            const p = a.payload as unknown as { action: string; location: string };
            return (
              <div
                key={a.id}
                className="rounded-xl border border-amber-700/50 bg-amber-950/30 p-3.5"
              >
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-amber-500">
                  <HelpCircle className="h-3.5 w-3.5" /> Did this happen?
                </p>
                <p className="mt-1.5 text-sm text-zinc-200">
                  Someone reckons they made you <span className="font-semibold">{p.action}</span>{' '}
                  <span className="font-semibold">{p.location}</span>.
                </p>
                {a.claim_note && (
                  <p className="mt-1 text-xs italic text-zinc-500">&ldquo;{a.claim_note}&rdquo;</p>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleVerdict(a.id, true)}
                    disabled={isPending}
                    className="flex-1 rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-cream disabled:opacity-60"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => handleVerdict(a.id, false)}
                    disabled={isPending}
                    className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 py-2 text-sm font-semibold text-red-400 disabled:opacity-60"
                  >
                    No
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Your mission */}
      {myAssignment ? (
        <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3.5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Your mission
          </p>
          {myAssignment.status === 'active' && (
            <>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note (e.g. he did it outside El Pimpi)"
                rows={2}
                className="mb-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              />
              <button
                onClick={handleClaim}
                disabled={isPending}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-cream disabled:opacity-60"
              >
                <Send className="h-3.5 w-3.5" /> I got them
              </button>
            </>
          )}
          {myAssignment.status === 'claimed' && (
            <p className="text-sm text-zinc-400">Waiting for confirmation...</p>
          )}
          {myAssignment.status === 'succeeded' && (
            <p className="flex items-center gap-1.5 text-sm text-emerald-500">
              <CheckCircle2 className="h-3.5 w-3.5" /> Confirmed. +1 point.
            </p>
          )}
          {myAssignment.status === 'disputed' && (
            <p className="flex items-center gap-1.5 text-sm text-amber-500">
              <ShieldAlert className="h-3.5 w-3.5" /> Disputed — awaiting admin review.
            </p>
          )}
          {myAssignment.status === 'void' && (
            <p className="flex items-center gap-1.5 text-sm text-zinc-500">
              <XCircle className="h-3.5 w-3.5" /> This mission was voided by a new round.
            </p>
          )}
        </div>
      ) : (
        snapshot.game.status === 'active' && (
          <p className="mb-4 text-sm text-zinc-500">No mission yet. Sit tight.</p>
        )
      )}

      {/* Scoreboard */}
      <div className="mb-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Scoreboard
        </p>
        <div className="space-y-1.5">
          {standings.map((p) => (
            <div
              key={p.attendee.id}
              className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-sm ${
                p.attendee.id === me.id ? 'bg-zinc-950' : ''
              }`}
            >
              <span className="text-zinc-200">{p.attendee.name}</span>
              <span className="font-semibold text-emerald-500">
                {(p.state as unknown as AssassinPlayerState).score ?? 0}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Feed */}
      {snapshot.feed.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Feed</p>
          <div className="space-y-1.5">
            {snapshot.feed.map((e) => (
              <p key={e.id} className="text-xs text-zinc-500">
                {formatEvent(e.type, e.payload as Record<string, string>)}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatEvent(type: string, payload: Record<string, string>): string {
  switch (type) {
    case 'confirmed':
      return `${payload.hunter} got someone to ${payload.action} ${payload.location}. +1 ${payload.hunter}.`;
    case 'round_opened':
      return payload.message ?? 'A new round is live.';
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

export function AssassinAdminView({ snapshot }: GameViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [adminView, setAdminView] = useState<AdminGameView | null>(null);
  const [confirmDeal, setConfirmDeal] = useState(false);

  function loadAdminView() {
    startTransition(async () => {
      const view = await getAdminGameView(snapshot.game.id);
      setAdminView(view);
    });
  }

  function handleDeal() {
    const activeCount = adminView?.assignments.filter((a) => a.status === 'active').length ?? 0;
    if (activeCount > 0 && !confirmDeal) {
      setConfirmDeal(true);
      return;
    }
    setConfirmDeal(false);
    startTransition(async () => {
      await dealAssassinRound(snapshot.game.id);
      router.refresh();
      loadAdminView();
    });
  }

  function handleOverride(assignmentId: string, status: 'succeeded' | 'failed') {
    startTransition(async () => {
      await adminOverrideAssignment(assignmentId, status);
      router.refresh();
      loadAdminView();
    });
  }

  function handleEndGame() {
    startTransition(async () => {
      await endGame(snapshot.game.id);
      router.refresh();
    });
  }

  if (!adminView) {
    loadAdminView();
  }

  const counts = {
    active: adminView?.assignments.filter((a) => a.status === 'active').length ?? 0,
    claimed: adminView?.assignments.filter((a) => a.status === 'claimed').length ?? 0,
    succeeded: adminView?.assignments.filter((a) => a.status === 'succeeded').length ?? 0,
    disputed: adminView?.disputes.length ?? 0,
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="mb-4 text-sm font-semibold text-zinc-200">Assassin admin</h2>

      {confirmDeal && (
        <p className="mb-3 text-xs text-amber-500">
          This voids {counts.active} live mission{counts.active === 1 ? '' : 's'}. Tap again to
          confirm.
        </p>
      )}
      <button
        onClick={handleDeal}
        disabled={isPending}
        className="mb-4 w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-cream disabled:opacity-60"
      >
        Deal missions
      </button>

      <p className="mb-3 text-xs text-zinc-500">
        Round: {counts.active} active, {counts.claimed} claimed, {counts.succeeded} confirmed,{' '}
        {counts.disputed} disputed
      </p>

      {adminView && adminView.disputes.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Dispute queue
          </p>
          {adminView.disputes.map((d) => (
            <div key={d.id} className="rounded-xl border border-red-900/50 bg-red-950/20 p-3">
              <p className="text-sm text-zinc-200">
                {d.actorName} vs {d.targetName}: {(d.payload as unknown as AssassinPayload).action}{' '}
                {(d.payload as unknown as AssassinPayload).location}
              </p>
              {d.claim_note && (
                <p className="mt-1 text-xs italic text-zinc-500">&ldquo;{d.claim_note}&rdquo;</p>
              )}
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => handleOverride(d.id, 'succeeded')}
                  disabled={isPending}
                  className="flex-1 rounded-lg bg-emerald-500 py-1.5 text-xs font-semibold text-cream disabled:opacity-60"
                >
                  Force success
                </button>
                <button
                  onClick={() => handleOverride(d.id, 'failed')}
                  disabled={isPending}
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 py-1.5 text-xs font-semibold text-red-400 disabled:opacity-60"
                >
                  Force fail
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {adminView && (
        <div className="mb-4 space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Players</p>
          {adminView.players.map((p) => (
            <div key={p.attendeeId} className="flex items-center justify-between text-sm">
              <span className="text-zinc-300">{p.name}</span>
              <span className="text-zinc-500">{(p.state as unknown as AssassinPlayerState).score ?? 0}</span>
            </div>
          ))}
        </div>
      )}

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
