'use client';

import { useState, useTransition, FormEvent } from 'react';
import { Plane } from 'lucide-react';
import { PublicAttendee } from '@/lib/types';
import { updateFlightDetails, setFlightsBookedStatus } from '@/app/actions';
import { useUser } from './UserProvider';
import TaxiClusters from './TaxiClusters';

function toLocalInputValue(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export default function FlightsView({ attendees }: { attendees: PublicAttendee[] }) {
  const { user, setUser } = useUser();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [outboundFlight, setOutboundFlight] = useState(user?.outbound_flight_details ?? '');
  const [outboundTime, setOutboundTime] = useState(toLocalInputValue(user?.outbound_arrival_time ?? null));
  const [returnFlight, setReturnFlight] = useState(user?.return_flight_details ?? '');
  const [returnTime, setReturnTime] = useState(toLocalInputValue(user?.return_departure_time ?? null));

  if (!user) return null;

  function handleToggleBooked() {
    const next = !user!.flights_booked;
    startTransition(async () => {
      const updated = await setFlightsBookedStatus(user!.id, next);
      setUser(updated);
    });
  }

  function handleSave(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const updated = await updateFlightDetails(user!.id, {
        outbound_flight_details: outboundFlight,
        outbound_arrival_time: outboundTime ? new Date(outboundTime).toISOString() : null,
        return_flight_details: returnFlight,
        return_departure_time: returnTime ? new Date(returnTime).toISOString() : null,
      });
      setUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plane className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-zinc-200">My flights</h2>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-medium transition ${
                user.flights_booked ? 'text-emerald-600' : 'text-zinc-500'
              }`}
            >
              {user.flights_booked ? 'Booked' : 'Not booked'}
            </span>
            <button
              type="button"
              onClick={handleToggleBooked}
              disabled={isPending}
              aria-label={user.flights_booked ? 'Mark flights as not booked' : 'Mark flights as booked'}
              className={`relative h-7 w-12 rounded-full transition ${
                user.flights_booked ? 'bg-emerald-500' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  user.flights_booked ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium uppercase tracking-wide text-zinc-500">Outbound arrival </legend>
            <input
              type="text"
              placeholder="Flight number, e.g. FR2104"
              value={outboundFlight}
              onChange={(e) => setOutboundFlight(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100"
            />
            <input
              type="datetime-local"
              value={outboundTime}
              onChange={(e) => setOutboundTime(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100"
            />
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium uppercase tracking-wide text-zinc-500">Return departure</legend>
            <input
              type="text"
              placeholder="Flight number, e.g. FR2105"
              value={returnFlight}
              onChange={(e) => setReturnFlight(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100"
            />
            <input
              type="datetime-local"
              value={returnTime}
              onChange={(e) => setReturnTime(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100"
            />
          </fieldset>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-cream active:scale-[0.98] disabled:opacity-60"
          >
            {isPending ? 'Saving...' : saved ? 'Saved ✓' : 'Save flight details'}
          </button>
        </form>
      </div>

      <TaxiClusters attendees={attendees} />
    </div>
  );
}
