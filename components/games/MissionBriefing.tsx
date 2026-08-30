'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Target, MapPin, Crosshair } from 'lucide-react';
import { GameAssignment, AssassinPayload } from '@/lib/types';
import { markMissionSeen } from '@/app/games/actions';

/**
 * Full-screen briefing overlay, shown once per mission (gated by
 * snapshot.hasUnseen upstream). Styled like LoginModal's overlay pattern.
 * The Eye/EyeOff toggle lets a player re-read a mission later without
 * holding the phone face-down.
 */
export default function MissionBriefing({
  assignment,
  targetName,
}: {
  assignment: GameAssignment;
  targetName: string;
}) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [revealed, setRevealed] = useState(true);
  const [isPending, startTransition] = useTransition();

  if (dismissed) return null;

  const payload = assignment.payload as unknown as AssassinPayload;

  function handleDismiss() {
    startTransition(async () => {
      await markMissionSeen(assignment.id);
      setDismissed(true);
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950 p-6 animate-fade-in">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="mb-6 text-center">
          <Crosshair className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">Your mission</h1>
          <p className="mt-1 text-sm text-red-400">Do not let them know it is you.</p>
        </div>

        <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            className="flex w-full items-center justify-end gap-1.5 text-xs font-medium text-zinc-500"
          >
            {revealed ? (
              <>
                <EyeOff className="h-3.5 w-3.5" /> Hide
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" /> Reveal
              </>
            )}
          </button>

          <div className={revealed ? '' : 'blur-md select-none'}>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
                <Target className="h-3.5 w-3.5" /> Target
              </label>
              <p className="text-lg font-bold text-zinc-100">{targetName}</p>
            </div>

            <div className="mt-4 border-t border-zinc-800 pt-4">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Mission
              </label>
              <p className="text-base text-zinc-200">{payload.action}</p>
            </div>

            <div className="mt-4 border-t border-zinc-800 pt-4">
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
                <MapPin className="h-3.5 w-3.5" /> Setting
              </label>
              <p className="text-base text-zinc-200">{payload.location}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            disabled={isPending}
            className="mt-2 w-full rounded-xl bg-emerald-500 py-3.5 text-base font-semibold text-cream transition active:scale-[0.98] disabled:opacity-60"
          >
            Got it, delete this message
          </button>
        </div>
      </div>
    </div>
  );
}
