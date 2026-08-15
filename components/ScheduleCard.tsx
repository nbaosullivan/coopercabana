import { MapPin, Navigation, Car, Clock } from 'lucide-react';
import { ScheduleItem } from '@/lib/types';
import { formatTime } from '@/lib/time';

export default function ScheduleCard({ item }: { item: ScheduleItem }) {
  const start = formatTime(item.start_time);
  const end = formatTime(item.end_time);

  return (
    <div className="relative pl-14">
      {/* Start time badge on the timeline rail */}
      <div className="absolute left-0 top-0 flex w-11 flex-col items-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-[10px] font-bold text-emerald-500">
          {start}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-zinc-100">{item.title}</h3>

          {(start || end) && (
            <span className="mt-0.5 flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-emerald-400">
              <Clock className="h-3 w-3" />
              {start}
              {end ? ` – ${end}` : ''}
            </span>
          )}
        </div>

        {item.description && (
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">{item.description}</p>
        )}

        {(item.location_name || item.address) && (
          <div className="mt-3 flex items-start gap-1.5 text-sm text-zinc-500">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" />
            <span>
              {item.location_name}
              {item.location_name && item.address ? ' — ' : ''}
              {item.address}
            </span>
          </div>
        )}

        {(item.google_maps_url || item.uber_url) && (
          <div className="mt-4 flex gap-2">
            {item.google_maps_url && (
              <a
                href={item.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-950 py-2.5 text-sm font-medium text-zinc-200 active:scale-[0.98]"
              >
                <Navigation className="h-4 w-4" /> Maps
              </a>
            )}
            {item.uber_url && (
              <a
                href={item.uber_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2.5 text-sm font-medium text-cream active:scale-[0.98]"
              >
                <Car className="h-4 w-4" /> Get Uber
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
