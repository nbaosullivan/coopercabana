'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { PublicAttendee } from '@/lib/types';
import { listGameKinds } from '@/lib/games/registry';
import { createGameAction, startGame } from '@/app/games/actions';

export default function NewGameCard({ allAttendees }: { allAttendees: PublicAttendee[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const kinds = listGameKinds();
  const [kind, setKind] = useState(kinds[0]?.kind ?? 'assassin');
  const [title, setTitle] = useState('Assassin - Day 2');
  const [selected, setSelected] = useState<string[]>(allAttendees.map((a) => a.id));
  const [word, setWord] = useState('SKATE');

  if (kinds.length === 0) return null;

  function toggleAttendee(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleCreate() {
    if (!title.trim() || selected.length === 0) return;
    startTransition(async () => {
      const config = kind === 'skate' ? { word: word.trim() || 'SKATE' } : {};
      const game = await createGameAction(kind, title.trim(), selected, config);
      await startGame(game.id);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-zinc-200">
        <Sparkles className="h-3.5 w-3.5" /> New game
      </h2>

      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Kind
        </label>
        <div className="flex gap-2">
          {kinds.map((k) => (
            <button
              key={k.kind}
              onClick={() => {
                setKind(k.kind);
                setTitle(k.kind === 'skate' ? 'SKATE - the weekend' : 'Assassin - Day 2');
              }}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                kind === k.kind
                  ? 'bg-emerald-500 text-cream'
                  : 'border border-zinc-700 bg-zinc-950 text-zinc-300'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-zinc-500">
          {kinds.find((k) => k.kind === kind)?.blurb}
        </p>
      </div>

      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
        />
      </div>

      {kind === 'skate' && (
        <div className="mb-3">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Word
          </label>
          <input
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value.toUpperCase())}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />
        </div>
      )}

      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Players
        </label>
        <div className="flex flex-wrap gap-2">
          {allAttendees.map((a) => (
            <button
              key={a.id}
              onClick={() => toggleAttendee(a.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                selected.includes(a.id)
                  ? 'bg-emerald-500 text-cream'
                  : 'border border-zinc-700 bg-zinc-950 text-zinc-300'
              }`}
            >
              {a.name}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleCreate}
        disabled={isPending || !title.trim() || selected.length === 0}
        className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-cream disabled:opacity-60"
      >
        Create
      </button>
    </div>
  );
}
