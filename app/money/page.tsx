import { getCurrentUser, getFinancesForUser, getGroupOverview, getAllAllocationsForAdmin } from '@/app/actions';
import MoneyView from '@/components/MoneyView';

export default async function MoneyPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [finances, groupOverview, adminAllocations] = await Promise.all([
    getFinancesForUser(user.id),
    getGroupOverview(),
    user.is_admin ? getAllAllocationsForAdmin() : Promise.resolve([]),
  ]);

  return (
    <div>
      <h1 className="mb-5 text-xl font-bold tracking-tight text-zinc-100">Money</h1>
      <MoneyView finances={finances} groupOverview={groupOverview} adminAllocations={adminAllocations} />
    </div>
  );
}
