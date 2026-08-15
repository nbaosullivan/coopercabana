'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { ExpenseAllocationWithExpense } from '@/lib/types';
import { togglePaymentStatus } from '@/app/actions';
import { useCurrency } from './CurrencyProvider';

export default function FinanceCard({
  allocation,
  editable = false,
}: {
  allocation: ExpenseAllocationWithExpense;
  /** Admin view: lets you toggle payment status on someone else's behalf. */
  editable?: boolean;
}) {
  const [isPaid, setIsPaid] = useState(allocation.is_paid);
  const [isPending, startTransition] = useTransition();
  const { format } = useCurrency();

  function toggle() {
    if (!editable) return;
    const next = !isPaid;
    setIsPaid(next);
    startTransition(async () => {
      await togglePaymentStatus(allocation.id, next);
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-zinc-100">{allocation.expense.title}</p>
        {allocation.expense.notes && (
          <p className="mt-0.5 truncate text-xs text-zinc-500">{allocation.expense.notes}</p>
        )}
        <p className="mt-1 text-base font-bold text-zinc-100">{format(allocation.amount_owed)}</p>
      </div>

      <button
        onClick={toggle}
        disabled={!editable || isPending}
        className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
          isPaid
            ? 'bg-emerald-500/10 text-emerald-400'
            : 'bg-red-500/10 text-red-400'
        } ${editable ? 'active:scale-95' : ''} ${isPending ? 'opacity-60' : ''}`}
      >
        {isPaid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
        {isPaid ? 'Paid' : 'Unpaid'}
      </button>
    </div>
  );
}
