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

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useUser();

  if (!user) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800/80 bg-zinc-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center gap-1 px-2 py-2.5 text-xs font-medium transition"
            >
              <Icon
                className={`h-6 w-6 ${active ? 'text-emerald-500' : 'text-zinc-500'}`}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className={active ? 'text-emerald-500' : 'text-zinc-500'}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
