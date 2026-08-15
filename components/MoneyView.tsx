'use client';

import { useState, useTransition } from 'react';
import { ChevronDown, CheckCircle2, Circle } from 'lucide-react';
import { FinancesSummary, GroupOverviewRow } from '@/lib/types';
import { AdminAllocationRow, togglePaymentStatus } from '@/app/actions';
import FinanceCard from './FinanceCard';
import PayNick from './PayNick';
import { useUser } from './UserProvider';
import { useCurrency } from './CurrencyProvider';

function AdminRow({ row }: { row: AdminAllocationRow }) {
  const [isPaid, setIsPaid] = useState(row.is_paid);
  const [isPending, startTransition] = useTransition();
  const { format } = useCurrency();

  function toggle() {
    const next = !isPaid;
    setIsPaid(next);
    startTransition(async () => {
      await togglePaymentStatus(row.id, next);
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className={`flex w-full items-center justify-between gap-3 border-b border-zinc-800/60 px-4 py-3 text-left last:border-0 ${isPending ? 'opacity-60' : ''}`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-zinc-200">{row.attendeeName}</p>
        <p className="truncate text-xs text-zinc-500">{row.expenseTitle}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm font-semibold text-zinc-300">{format(row.amount_owed)}</span>
        {isPaid ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : (
          <Circle className="h-5 w-5 text-zinc-600" />
        )}
      </div>
    </button>
  );
}

export default function MoneyView({
  finances,
  groupOverview,
  adminAllocations,
}: {
  finances: FinancesSummary;
  groupOverview: GroupOverviewRow[];
  adminAllocations: AdminAllocationRow[];
}) {
  const { user } = useUser();
  const { format } = useCurrency();
  const [matrixOpen, setMatrixOpen] = useState(false);
  const isAdmin = user?.is_admin ?? false;

  return (
    <div className="space-y-6">
      {/* Personal Ledger */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Total balance outstanding
        </p>
        <p
          className={`mt-1 text-4xl font-bold tracking-tight ${
            finances.totalOutstanding > 0 ? 'text-red-400' : 'text-emerald-500'
          }`}
        >
          {format(finances.totalOutstanding)}
        </p>
        <div className="mt-4 flex items-center gap-4 border-t border-zinc-800 pt-4 text-sm">
          <div>
            <span className="text-zinc-500">Settled </span>
            <span className="font-semibold text-zinc-200">{format(finances.totalPaid)}</span>
          </div>
          <div className="h-4 w-px bg-zinc-800" />
          <div>
            <span className="text-zinc-500">Total share </span>
            <span className="font-semibold text-zinc-200">{format(finances.totalOwed)}</span>
          </div>
        </div>
      </div>

      {/* Itemized expenses */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Your expenses
        </h2>
        <div className="space-y-2.5">
          {finances.allocations.map((a) => (
            <FinanceCard key={a.id} allocation={a} editable={isAdmin} />
          ))}
        </div>
      </div>

      {/* Payment info */}
      <PayNick />

      {/* Group ledger matrix */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
        <button
          onClick={() => setMatrixOpen((v) => !v)}
          className="flex w-full items-center justify-between p-5"
        >
          <h2 className="text-sm font-semibold text-zinc-200">Group ledger</h2>
          <ChevronDown
            className={`h-4 w-4 text-zinc-500 transition-transform ${matrixOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {matrixOpen && (
          <div className="border-t border-zinc-800">
            {groupOverview.map((row) => (
              <div
                key={row.attendee.id}
                className="flex items-center justify-between border-b border-zinc-800/60 px-5 py-3 text-sm last:border-0"
              >
                <span className="text-zinc-300">{row.attendee.name}</span>
                <span
                  className={
                    row.totalOutstanding > 0 ? 'font-semibold text-red-400' : 'font-semibold text-emerald-500'
                  }
                >
                  {row.totalOutstanding > 0 ? `${format(row.totalOutstanding)} owed` : 'Settled'}
                </span>
              </div>
            ))}

            {isAdmin && (
              <div className="border-t border-zinc-800">
                <p className="px-5 pt-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Admin: mark paid on someone&apos;s behalf
                </p>
                <div className="mt-2">
                  {adminAllocations.map((row) => (
                    <AdminRow key={row.id} row={row} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
