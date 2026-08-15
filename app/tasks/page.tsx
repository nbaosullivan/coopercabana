import { getAttendeeList, getGroupOverview } from '@/app/actions';
import TasksView from '@/components/TasksView';

export default async function TasksPage() {
  const [allAttendees, groupOverview] = await Promise.all([getAttendeeList(), getGroupOverview()]);

  return (
    <div>
      <h1 className="mb-5 text-xl font-bold tracking-tight text-zinc-100">Tasks</h1>
      <TasksView allAttendees={allAttendees} groupOverview={groupOverview} />
    </div>
  );
}
