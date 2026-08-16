'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, XCircle, Shirt } from 'lucide-react';
import { PublicAttendee, TshirtSize, GroupOverviewRow } from '@/lib/types';
import { updateTshirtSize, setFlightsBookedStatus } from '@/app/actions';
import { useUser } from './UserProvider';
import { useCurrency } from './CurrencyProvider';

const SIZES: TshirtSize[] = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

export default function TasksView({
  allAttendees,
  groupOverview,
}: {
  allAttendees: PublicAttendee[];
  groupOverview: GroupOverviewRow[];
}) {
  const { user, setUser } = useUser();
  const { format } = useCurrency();
  const [isPending, startTransition] = useTransition();

  if (!user) return null;

  function handleTshirtChange(size: TshirtSize) {
    startTransition(async () => {
      const updated = await updateTshirtSize(user!.id, size);
      setUser(updated);
    });
  }

  function handleFlightToggle() {
    startTransition(async () => {
      const updated = await setFlightsBookedStatus(user!.id, !user!.flights_booked);
      setUser(updated);
    });
  }

  const outstandingByAttendee = new Map(groupOverview.map((r) => [r.attendee.id, r.totalOutstanding]));

  return (
    <div className="space-y-6">
      {/* Personal checklist */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-200">Your checklist</h2>

        <div className="mb-4">
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
            <Shirt className="h-3.5 w-3.5" /> T-shirt size
          </label>
          <div className="flex flex-wrap gap-2">
            {SIZES.map((size) => (
              <button
                key={size}
                onClick={() => handleTshirtChange(size)}
                disabled={isPending}
                className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                  user.tshirt_size === size
                    ? 'bg-emerald-500 text-cream'
                    : 'border border-zinc-700 bg-zinc-950 text-zinc-300'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
          <span className="text-sm text-zinc-300">Flights booked</span>
          <button
            onClick={handleFlightToggle}
            disabled={isPending}
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

      {/* Admin dashboard */}
      {user.is_admin && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-200">Admin dashboard</h2>

          <div className="space-y-3">
            {allAttendees.map((a) => {
              const outstanding = outstandingByAttendee.get(a.id) ?? 0;
              return (
                <div key={a.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-zinc-100">{a.name}</p>
                    {outstanding > 0 ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-red-400">
                        <XCircle className="h-3.5 w-3.5" /> {format(outstanding)} owed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-500">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Settled
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex gap-4 text-xs text-zinc-500">
                    <span>Shirt: {a.tshirt_size ?? 'Not set'}</span>
                    <span>Flights: {a.flights_booked ? 'Booked' : 'Not booked'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
