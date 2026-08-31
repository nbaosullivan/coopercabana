import { getItinerary, getDayLocks, getCurrentUser } from '@/app/actions';
import ScheduleView from '@/components/ScheduleView';

export default async function SchedulePage() {
  const [itinerary, dayLocks, me] = await Promise.all([
    getItinerary(),
    getDayLocks(),
    getCurrentUser(),
  ]);

  return (
    <div>
      <h1 className="mb-5 text-xl font-bold tracking-tight text-zinc-100">Schedule</h1>
      <ScheduleView itinerary={itinerary} dayLocks={dayLocks} isAdmin={me?.is_admin ?? false} />
    </div>
  );
}
