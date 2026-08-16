'use client';

import { useState } from 'react';
import { ScheduleItem } from '@/lib/types';
import ScheduleCard from './ScheduleCard';

export default function ScheduleView({
  itinerary,
}: {
  itinerary: Record<number, ScheduleItem[]>;
}) {
  const days = Object.keys(itinerary)
    .map(Number)
    .sort((a, b) => a - b);
  const [activeDay, setActiveDay] = useState<number>(days[0] ?? 1);

  const items = itinerary[activeDay] ?? [];

  return (
    <div>
      <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4">
        {days.map((day) => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeDay === day
                ? 'bg-emerald-500 text-cream'
                : 'border border-zinc-800 bg-zinc-900 text-zinc-400'
            }`}
          >
            Day {day}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="py-12 text-center text-sm text-zinc-500">Nothing planned for this day yet.</p>
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
