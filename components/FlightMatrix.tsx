import { PlaneLanding } from 'lucide-react';
import { PublicAttendee } from '@/lib/types';

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function FlightMatrix({ attendees }: { attendees: PublicAttendee[] }) {
  if (attendees.length === 0) {
    return (
      <p className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-center text-sm text-zinc-500">
        No one&apos;s booked their flights yet.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
      {attendees.map((a, i) => (
        <div
          key={a.id}
          className="flex items-center gap-3 border-b border-zinc-800/60 px-4 py-3 last:border-0"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
            <PlaneLanding className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-200">{a.name}</p>
            <p className="truncate text-xs text-zinc-500">{a.outbound_flight_details}</p>
          </div>
          <p className="shrink-0 text-right text-sm font-semibold text-zinc-300">
            {a.outbound_arrival_time ? formatTime(a.outbound_arrival_time) : '—'}
          </p>
        </div>
      ))}
    </div>
  );
}
