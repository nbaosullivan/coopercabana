'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser, setPin } from '@/app/actions';
import { PublicAttendee } from '@/lib/types';
import { Loader2, ChevronDown, ArrowLeft } from 'lucide-react';

type Step = 'login' | 'setPin';

export default function LoginModal({
  attendees,
  onSuccess,
}: {
  attendees: PublicAttendee[];
  onSuccess: (u: PublicAttendee) => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('login');
  const [attendeeId, setAttendeeId] = useState('');
  const [secret, setSecret] = useState('');
  const [pin, setPinVal] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selected = attendees.find((a) => a.id === attendeeId);
  const hasPin = selected?.has_pin ?? false;

  /** Swap in the logged-in tree, then re-fetch server components (header
   * totals, admin panels) once the cookie is set. Refreshing on the client
   * AFTER the state swap avoids racing the router update against it — the
   * server-action + simultaneous revalidatePath combo is what crashed dev. */
  function completeLogin(attendee: PublicAttendee) {
    onSuccess(attendee);
    setTimeout(() => router.refresh(), 0);
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!attendeeId) {
      setError('Pick your name first.');
      return;
    }
    if (!secret) {
      setError(hasPin ? 'Enter your PIN.' : 'Enter the group password.');
      return;
    }

    setLoading(true);
    try {
      const result = await loginUser(attendeeId, secret);
      if (result.success && result.attendee) {
        if (result.needsPinSetup) {
          setStep('setPin');
          setSecret('');
        } else {
          completeLogin(result.attendee);
        }
      } else {
        setError(result.error ?? 'Something went wrong.');
        setSecret('');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSetPin(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError('Choose a 4-digit PIN (e.g. 1234).');
      return;
    }

    setLoading(true);
    try {
      const result = await setPin(attendeeId, pin);
      if (result.success && result.attendee) {
        completeLogin(result.attendee);
      } else {
        setError(result.error ?? 'Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  }

  function backToLogin() {
    setStep('login');
    setError(null);
    setPinVal('');
  }

  const selectedName = selected?.name ?? '';

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

        {step === 'login' ? (
          <form
            onSubmit={handleLogin}
            className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
          >
            <div>
              <label
                htmlFor="attendee"
                className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500"
              >
                Who&apos;s this?
              </label>
              <div className="relative">
                <select
                  id="attendee"
                  value={attendeeId}
                  onChange={(e) => {
                    setAttendeeId(e.target.value);
                    setError(null);
                  }}
                  autoFocus
                  className="w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-950 py-3.5 pl-4 pr-10 text-base text-zinc-100 [color-scheme:dark]"
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
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              </div>
            </div>

            <div>
              <label
                htmlFor="secret"
                className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500"
              >
                {hasPin ? 'Your PIN' : 'Group password'}
              </label>
              <input
                id="secret"
                type="password"
                autoComplete="off"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder={hasPin ? '••••' : '••••••'}
                inputMode={hasPin ? 'numeric' : 'text'}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3.5 text-base text-zinc-100"
              />
              {!hasPin && attendeeId && (
                <p className="mt-1.5 text-xs text-zinc-500">
                  First time? Log in with the group password, then set your own PIN.
                </p>
              )}
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading || !attendeeId || !secret}
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
        ) : (
          <form
            onSubmit={handleSetPin}
            className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
          >
            <button
              type="button"
              onClick={backToLogin}
              className="mb-1 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>

            <div className="text-center">
              <p className="text-sm font-medium text-zinc-300">Welcome, {selectedName}!</p>
              <p className="mt-1 text-xs text-zinc-500">
                Set a personal PIN so you can log in quickly without the group password.
              </p>
            </div>

            <div>
              <label
                htmlFor="pin"
                className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500"
              >
                Choose your 4-digit PIN
              </label>
              <input
                id="pin"
                type="password"
                autoComplete="off"
                value={pin}
                onChange={(e) => {
                  // Only allow digits, max 4
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPinVal(val);
                  setError(null);
                }}
                placeholder="••••"
                inputMode="numeric"
                maxLength={4}
                autoFocus
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3.5 text-base text-zinc-100 text-center tracking-[0.5em]"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading || pin.length !== 4}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-base font-semibold text-cream transition active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Saving...
                </>
              ) : (
                'Set PIN & enter'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}