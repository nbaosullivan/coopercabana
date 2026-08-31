'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, CheckCircle2, AlertTriangle, CircleDollarSign } from 'lucide-react';
import { useUser } from './UserProvider';
import { useCurrency } from './CurrencyProvider';
import { Currency } from '@/lib/currency';
import { logoutUser } from '@/app/actions';

interface Props {
  totalOutstanding: number;
  hideChecklist?: boolean;
}

export default function Header({ totalOutstanding, hideChecklist = false }: Props) {
  const { user, setUser } = useUser();
  const { currency, setCurrency, format } = useCurrency();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return null;

  async function handleSwitchUser() {
    setMenuOpen(false);
    await logoutUser();
    setUser(null);
    router.refresh();
  }

  // Once the checklist is hidden there's no way to act on this nag, so drop it.
  const needsTshirt = !hideChecklist && !user.tshirt_size;
  const owesMoney = totalOutstanding > 0;

  let banner: { tone: 'amber' | 'red' | 'emerald'; icon: JSX.Element; text: string } | null = null;
  if (needsTshirt) {
    banner = {
      tone: 'amber',
      icon: <AlertTriangle className="h-4 w-4 shrink-0" />,
      text: 'Select your T-shirt size',
    };
  } else if (owesMoney) {
    banner = {
      tone: 'red',
      icon: <CircleDollarSign className="h-4 w-4 shrink-0" />,
      text: `You have ${format(totalOutstanding)} outstanding`,
    };
  } else {
    banner = {
      tone: 'emerald',
      icon: <CheckCircle2 className="h-4 w-4 shrink-0" />,
      text: "You're all set!",
    };
  }

  const toneClasses: Record<string, string> = {
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <img
            src="/coopercabana.png"
            alt="Coopercabana sun stamp"
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600">
              1&ndash;4 Sept &middot; Málaga
            </p>
            <h1 className="text-lg font-bold leading-tight tracking-tight text-zinc-100">
              COOPERCABANA
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Currency toggle */}
          <div
            role="group"
            aria-label="Currency"
            className="flex items-center rounded-full border border-zinc-800 bg-zinc-900 p-0.5"
          >
            {(['EUR', 'GBP'] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                aria-pressed={currency === c}
                title={c === 'EUR' ? 'Euros (€)' : 'Pounds (£)'}
                className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${
                  currency === c
                    ? 'bg-emerald-500 text-cream'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                {c === 'EUR' ? '€' : '£'}
              </button>
            ))}
          </div>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 py-1.5 pl-3 pr-2 text-sm font-medium text-zinc-200 active:scale-95"
            >
              {user.name.split(' ')[0]}
              <ChevronDown className="h-4 w-4 text-zinc-500" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl animate-fade-in">
                  <button
                    onClick={handleSwitchUser}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-zinc-300 hover:bg-zinc-800"
                  >
                    <LogOut className="h-4 w-4" /> Switch user
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 pb-3">
        <div
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${toneClasses[banner.tone]}`}
        >
          {banner.icon}
          {banner.text}
        </div>
      </div>
    </header>
  );
}
