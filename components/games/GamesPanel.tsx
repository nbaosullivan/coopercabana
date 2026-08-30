'use client';

import { GameSnapshot, PublicAttendee } from '@/lib/types';
import { getGameKind } from '@/lib/games/registry';
import NewGameCard from './NewGameCard';
import PromptPoolEditor from './PromptPoolEditor';
import './index';

export default function GamesPanel({
  snapshots,
  me,
  allAttendees,
}: {
  snapshots: GameSnapshot[];
  me: PublicAttendee;
  allAttendees: PublicAttendee[];
}) {
  if (snapshots.length === 0 && !me.is_admin) return null;

  return (
    <div className="space-y-6">
      {snapshots.map((snapshot) => {
        const def = getGameKind(snapshot.game.kind);
        if (!def) {
          return (
            <div
              key={snapshot.game.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
            >
              <h2 className="text-sm font-semibold text-zinc-200">Unsupported game</h2>
              <p className="mt-1 text-xs text-zinc-500">
                &ldquo;{snapshot.game.title}&rdquo; has a kind this app version does not know how
                to render.
              </p>
            </div>
          );
        }

        const { PlayerView, AdminView } = def;
        return (
          <div key={snapshot.game.id} className="space-y-4">
            <PlayerView snapshot={snapshot} me={me} allAttendees={allAttendees} />
            {me.is_admin && <AdminView snapshot={snapshot} me={me} allAttendees={allAttendees} />}
          </div>
        );
      })}

      {me.is_admin && (
        <>
          <NewGameCard allAttendees={allAttendees} />
          <PromptPoolEditor />
        </>
      )}
    </div>
  );
}
