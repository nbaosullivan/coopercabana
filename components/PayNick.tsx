'use client';

import { useState } from 'react';
import { Landmark, Copy, Check } from 'lucide-react';

type Country = 'uk' | 'fr';

const DETAILS: Record<
  Country,
  { label: string; rows: { label: string; value: string; mono?: boolean }[] }
> = {
  uk: {
    label: '🇬🇧 UK bank details',
    rows: [
      { label: 'Name', value: "Nicholas O'Sullivan" },
      { label: 'Account number', value: '82326755', mono: true },
      { label: 'Sort code', value: '04-00-04', mono: true },
      { label: 'Reference', value: 'STAG26', mono: true },
    ],
  },
  fr: {
    label: '🇫🇷 French bank details',
    rows: [
      { label: 'Name', value: 'M OSULLIVAN NICHOLAS' },
      { label: 'IBAN', value: 'FR76 3000 4031 9500 0010 4420 644', mono: true },
      { label: 'BIC', value: 'BNPAFRPPXXX', mono: true },
      { label: 'Reference', value: 'STAG26', mono: true },
    ],
  },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be blocked in insecure contexts — ignore.
    }
  }

  return (
    <button
      onClick={copy}
      aria-label={`Copy ${text}`}
      className="rounded-lg border border-zinc-700 bg-zinc-950 p-1.5 text-zinc-400 transition hover:text-zinc-100 active:scale-95"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export default function PayNick() {
  const [country, setCountry] = useState<Country>('uk');
  const details = DETAILS[country];

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Landmark className="h-4 w-4 text-emerald-500" />
        <h2 className="text-sm font-semibold text-zinc-200">How to pay Nick</h2>
      </div>

      {/* Currency / country toggle */}
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
        {(['uk', 'fr'] as Country[]).map((c) => (
          <button
            key={c}
            onClick={() => setCountry(c)}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              country === c ? 'bg-emerald-500 text-cream' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {c === 'uk' ? '🇬🇧 UK (£)' : '🇫🇷 France (€)'}
          </button>
        ))}
      </div>

      {/* Bank details */}
      <div className="space-y-2.5">
        {details.rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-zinc-500">{row.label}</p>
              <p
                className={`truncate text-sm text-zinc-100 ${
                  row.mono ? 'font-mono tabular-nums' : 'font-medium'
                }`}
              >
                {row.value}
              </p>
            </div>
            <CopyButton text={row.value} />
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-zinc-600">
        Add <span className="font-mono text-zinc-400">STAG26</span> as the reference either way.
      </p>
    </div>
  );
}
