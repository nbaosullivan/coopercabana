'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { GamePrompt, PromptCategory } from '@/lib/types';
import { getPromptsForAdmin, addPrompt, togglePrompt, removePrompt } from '@/app/games/actions';

function PromptColumn({
  title,
  kind,
  category,
  prompts,
  onChange,
}: {
  title: string;
  kind: string;
  category: PromptCategory;
  prompts: GamePrompt[];
  onChange: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState('');

  const rows = prompts.filter((p) => p.category === category);

  function handleAdd() {
    if (!draft.trim()) return;
    startTransition(async () => {
      await addPrompt(kind, category, draft.trim());
      setDraft('');
      router.refresh();
      onChange();
    });
  }

  function handleToggle(id: string, active: boolean) {
    startTransition(async () => {
      await togglePrompt(id, active);
      router.refresh();
      onChange();
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      await removePrompt(id);
      router.refresh();
      onChange();
    });
  }

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">{title}</p>
      <div className="mb-2 space-y-1.5">
        {rows.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5"
          >
            <span className={`text-sm ${p.is_active ? 'text-zinc-200' : 'text-zinc-600 line-through'}`}>
              {p.text}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggle(p.id, !p.is_active)}
                disabled={isPending}
                className="text-xs font-medium text-zinc-400"
              >
                {p.is_active ? 'Active' : 'Off'}
              </button>
              <button
                onClick={() => handleRemove(p.id)}
                disabled={isPending}
                className="text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add..."
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100"
        />
        <button
          onClick={handleAdd}
          disabled={isPending || !draft.trim()}
          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-cream disabled:opacity-60"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function PromptPoolEditor() {
  const [open, setOpen] = useState(false);
  const [assassinPrompts, setAssassinPrompts] = useState<GamePrompt[]>([]);
  const [skatePrompts, setSkatePrompts] = useState<GamePrompt[]>([]);

  async function load() {
    const [a, s] = await Promise.all([getPromptsForAdmin('assassin'), getPromptsForAdmin('skate')]);
    setAssassinPrompts(a);
    setSkatePrompts(s);
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-sm font-semibold text-zinc-200"
      >
        Prompt pools
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <PromptColumn
            title="Assassin - Actions"
            kind="assassin"
            category="action"
            prompts={assassinPrompts}
            onChange={load}
          />
          <PromptColumn
            title="Assassin - Locations"
            kind="assassin"
            category="location"
            prompts={assassinPrompts}
            onChange={load}
          />
          <PromptColumn
            title="SKATE - Challenges"
            kind="skate"
            category="challenge"
            prompts={skatePrompts}
            onChange={load}
          />
        </div>
      )}
    </div>
  );
}
