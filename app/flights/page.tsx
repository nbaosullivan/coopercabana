import { getAttendeeList, getCurrentUser } from '@/app/actions';
import { resolveBoardingPasses } from '@/lib/boardingPassFiles';
import FlightsView from '@/components/FlightsView';

export default async function FlightsPage() {
  const [attendees, user] = await Promise.all([getAttendeeList(), getCurrentUser()]);
  const passes = user ? resolveBoardingPasses(user.id) : { outbound: null, return: null };

  return (
    <div>
      <h1 className="mb-5 text-xl font-bold tracking-tight text-zinc-100">Flights &amp; Logistics</h1>
      <FlightsView attendees={attendees} passes={passes} />
    </div>
  );
}
