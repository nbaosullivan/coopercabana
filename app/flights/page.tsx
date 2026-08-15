import { getAttendeeList } from '@/app/actions';
import FlightsView from '@/components/FlightsView';

export default async function FlightsPage() {
  const attendees = await getAttendeeList();

  return (
    <div>
      <h1 className="mb-5 text-xl font-bold tracking-tight text-zinc-100">Flights &amp; Logistics</h1>
      <FlightsView attendees={attendees} />
    </div>
  );
}
