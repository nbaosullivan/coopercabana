'use client';

import { useState, FormEvent } from 'react';
import { loginUser } from '@/app/actions';
import { PublicAttendee } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function LoginModal({
  attendees,
  onSuccess,
}: {
  attendees: PublicAttendee[];
  onSuccess: (u: PublicAttendee) => void;
}) {
  const [attendeeId, setAttendeeId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!attendeeId) {
      setError('Pick your name first.');
      return;
    }
    if (pin.length !== 4) {
      setError('PIN must be 4 digits.');
      return;
    }

    setLoading(true);
    try {
      const result = await loginUser(attendeeId, pin);
      if (result.success && result.attendee) {
        onSuccess(result.attendee);
      } else {
        setError(result.error ?? 'Something went wrong.');
        setPin('');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950 p-6 animate-fade-in">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="mb-8 text-center">
          <img
            src="/coopercabana.png"
            alt="Coopercabana sun stamp"
            className="mx-auto mb-3 h-16 w-16 rounded-full object-cover"
          />
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">COOPERCABANA</h1>
          <p className="mt-1 text-sm text-zinc-400">Málaga &middot; 1&ndash;4 September</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
        >
          <div>
            <label
              htmlFor="attendee"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500"
            >
              Your name
            </label>
            <select
              id="attendee"
              value={attendeeId}
              onChange={(e) => setAttendeeId(e.target.value)}
              className="w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3.5 text-base text-zinc-100"
            >
              <option value="" disabled>
                Select your name
              </option>
              {attendees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="pin"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500"
            >
              4-digit PIN
            </label>
            <input
              id="pin"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              autoComplete="off"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3.5 text-center text-2xl tracking-[0.6em] text-zinc-100"
              placeholder="••••"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-base font-semibold text-cream transition active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Checking...
              </>
            ) : (
              "Let's go"
            )}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-zinc-600">
          Default PIN is 1234 unless you&apos;ve changed it.
        </p>
      </div>
    </div>
  );
}
