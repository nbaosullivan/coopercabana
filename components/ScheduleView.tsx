'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { ScheduleItem, ScheduleDay } from '@/lib/types';
import { toggleDayLock } from '@/app/actions';
import ScheduleCard from './ScheduleCard';

export default function ScheduleView({
  itinerary,
  dayLocks,
  isAdmin,
}: {
  itinerary: Record<number, ScheduleItem[]>;
  dayLocks: ScheduleDay[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const unlockedByDay = new Map(dayLocks.map((d) => [d.day_number, !d.is_locked]));
  const allDays = Object.keys(itinerary)
    .map(Number)
    .sort((a, b) => a - b);
  const unlockedDays = allDays.filter((d) => unlockedByDay.get(d) === true);

  // Everyone sees every day tab — locked ones just show a lock icon.
  // Default to the first unlocked day when one exists; otherwise the first
  // day (shown locked). Chosen deterministically so the server and client
  // renders agree.
  const [activeDay, setActiveDay] = useState<number>(
    unlockedDays[0] ?? allDays[0] ?? 1
  );

  const activeIsLocked = unlockedByDay.get(activeDay) !== true;
  const items = itinerary[activeDay] ?? [];

  function handleSelectDay(day: number, locked: boolean) {
    // Non-admins can't open a locked day at all — it stays a lock icon.
    if (locked && !isAdmin) return;
    setActiveDay(day);
  }

  function handleToggleDayLock(day: number, unlock: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        await toggleDayLock(day, unlock);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update lock state.');
      }
    });
  }

  return (
    <div>
      {allDays.length > 0 && (
        <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4">
          {allDays.map((day) => {
            const locked = unlockedByDay.get(day) !== true;
            const active = activeDay === day;
            const disabled = locked && !isAdmin;
            return (
              <button
                key={day}
                onClick={() => handleSelectDay(day, locked)}
                disabled={isPending || disabled}
                aria-disabled={disabled}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
                  disabled ? 'cursor-not-allowed' : ''
                } ${
                  active
                    ? 'bg-emerald-500 text-cream'
                    : 'border border-zinc-800 bg-zinc-900 text-zinc-400'
                }`}
              >
                Day {day}
                {locked && <Lock className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
      )}

      {activeIsLocked ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-12 text-center">
          <Lock className="mx-auto mb-3 h-6 w-6 text-zinc-600" />
          <p className="text-sm font-semibold text-zinc-300">Day {activeDay} is locked</p>
          <p className="mt-1 text-sm text-zinc-500">
            Hidden from the group until {isAdmin ? 'you reveal' : 'the organiser reveals'} it.
          </p>
          {isAdmin && (
            <button
              onClick={() => handleToggleDayLock(activeDay, false)}
              disabled={isPending}
              className="mt-4 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-cream disabled:opacity-60"
            >
              Unlock day
            </button>
          )}
          {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        </div>
      ) : items.length === 0 ? (
        <p className="py-12 text-center text-sm text-zinc-500">
          Nothing planned for this day yet.
        </p>
      ) : (
        <div className="relative space-y-4">
          {/* Vertical timeline rail */}
          <div className="absolute bottom-4 left-[24px] top-4 w-px bg-emerald-500/30" />
          {items.map((item) => (
            <ScheduleCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
