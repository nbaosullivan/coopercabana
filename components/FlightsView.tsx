'use client';

import { useState, useTransition, FormEvent } from 'react';
import { Plane, Calendar, Clock } from 'lucide-react';
import { PublicAttendee } from '@/lib/types';
import { updateFlightDetails, setFlightsBookedStatus } from '@/app/actions';
import { wallClockToISO, toZoneParts } from '@/lib/time';
import { useUser } from './UserProvider';
import TaxiClusters from './TaxiClusters';
import BoardingPassCard from './BoardingPassCard';

export default function FlightsView({
  attendees,
  passes,
}: {
  attendees: PublicAttendee[];
  passes: { outbound: string | null; return: string | null };
}) {
  const { user, setUser } = useUser();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [outboundFlight, setOutboundFlight] = useState(user?.outbound_flight_details ?? '');
  const outbound = toZoneParts(user?.outbound_arrival_time ?? null);
  const [outboundDate, setOutboundDate] = useState(outbound.date);
  const [outboundTime, setOutboundTime] = useState(outbound.time);
  const [returnFlight, setReturnFlight] = useState(user?.return_flight_details ?? '');
  const ret = toZoneParts(user?.return_departure_time ?? null);
  const [returnDate, setReturnDate] = useState(ret.date);
  const [returnTime, setReturnTime] = useState(ret.time);

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
        outbound_arrival_time:
          outboundDate && outboundTime ? wallClockToISO(outboundDate, outboundTime) : null,
        return_flight_details: returnFlight,
        return_departure_time:
          returnDate && returnTime ? wallClockToISO(returnDate, returnTime) : null,
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
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-zinc-200">Outbound</legend>

            <div className="space-y-1.5">
              <label
                htmlFor="outbound-flight"
                className="block text-xs font-medium uppercase tracking-wide text-zinc-500"
              >
                Flight number
              </label>
              <input
                id="outbound-flight"
                type="text"
                placeholder="e.g. FR2104"
                value={outboundFlight}
                onChange={(e) => setOutboundFlight(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="outbound-arrival"
                className="block text-xs font-medium uppercase tracking-wide text-zinc-500"
              >
                Arrival date &amp; time <span className="normal-case text-zinc-600">(Málaga)</span>
              </label>
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <Calendar className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    id="outbound-arrival"
                    type="date"
                    value={outboundDate}
                    onChange={(e) => setOutboundDate(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 py-3 pl-10 pr-3 text-sm text-zinc-100 [color-scheme:dark]"
                  />
                </div>
                <div className="relative shrink-0">
                  <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="time"
                    value={outboundTime}
                    onChange={(e) => setOutboundTime(e.target.value)}
                    className="w-32 rounded-xl border border-zinc-700 bg-zinc-950 py-3 pl-9 pr-3 text-sm text-zinc-100 [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-zinc-200">Return</legend>

            <div className="space-y-1.5">
              <label
                htmlFor="return-flight"
                className="block text-xs font-medium uppercase tracking-wide text-zinc-500"
              >
                Flight number
              </label>
              <input
                id="return-flight"
                type="text"
                placeholder="e.g. FR2105"
                value={returnFlight}
                onChange={(e) => setReturnFlight(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="return-departure"
                className="block text-xs font-medium uppercase tracking-wide text-zinc-500"
              >
                Departure date &amp; time <span className="normal-case text-zinc-600">(Málaga)</span>
              </label>
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <Calendar className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    id="return-departure"
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 py-3 pl-10 pr-3 text-sm text-zinc-100 [color-scheme:dark]"
                  />
                </div>
                <div className="relative shrink-0">
                  <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="time"
                    value={returnTime}
                    onChange={(e) => setReturnTime(e.target.value)}
                    className="w-32 rounded-xl border border-zinc-700 bg-zinc-950 py-3 pl-9 pr-3 text-sm text-zinc-100 [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>
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

      <BoardingPassCard attendeeId={user.id} passes={passes} />

      <TaxiClusters attendees={attendees} />
    </div>
  );
}
