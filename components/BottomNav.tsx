'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, CreditCard, Plane, CheckSquare } from 'lucide-react';
import { useUser } from './UserProvider';

const TABS = [
  { href: '/schedule', label: 'Schedule', icon: Calendar },
  { href: '/money', label: 'Money', icon: CreditCard },
  { href: '/flights', label: 'Flights', icon: Plane },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
];

export default function BottomNav({ pendingGameCount = 0 }: { pendingGameCount?: number }) {
  const pathname = usePathname();
  const { user } = useUser();

  if (!user) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800/80 bg-zinc-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          const showBadge = href === '/tasks' && pendingGameCount > 0;
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center gap-1 px-2 py-2.5 text-xs font-medium transition"
            >
              <span className="relative">
                <Icon
                  className={`h-6 w-6 ${active ? 'text-emerald-500' : 'text-zinc-500'}`}
                  strokeWidth={active ? 2.5 : 2}
                />
                {showBadge && (
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-zinc-950" />
                )}
              </span>
              <span className={active ? 'text-emerald-500' : 'text-zinc-500'}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
