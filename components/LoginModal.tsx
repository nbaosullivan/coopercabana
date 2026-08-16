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
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!attendeeId) {
      setError('Pick your name first.');
      return;
    }
    if (!password) {
      setError('Enter the group password.');
      return;
    }

    setLoading(true);
    try {
      const result = await loginUser(attendeeId, password);
      if (result.success && result.attendee) {
        onSuccess(result.attendee);
      } else {
        setError(result.error ?? 'Something went wrong.');
        setPassword('');
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
              Who&apos;s this?
            </label>
            <select
              id="attendee"
              value={attendeeId}
              onChange={(e) => setAttendeeId(e.target.value)}
              autoFocus
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3.5 text-base text-zinc-100 [color-scheme:dark]"
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
              htmlFor="password"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500"
            >
              Group password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3.5 text-base text-zinc-100"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || !attendeeId || !password}
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
      </div>
    </div>
  );
}
