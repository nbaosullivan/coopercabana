import { getAttendeeList, getGroupOverview, getCurrentUser, getHideChecklist } from '@/app/actions';
import { getActiveGameSnapshots } from '@/app/games/actions';
import TasksView from '@/components/TasksView';

export default async function TasksPage() {
  const [allAttendees, groupOverview, snapshots, me, hideChecklist] = await Promise.all([
    getAttendeeList(),
    getGroupOverview(),
    getActiveGameSnapshots(),
    getCurrentUser(),
    getHideChecklist(),
  ]);

  return (
    <div>
      <h1 className="mb-5 text-xl font-bold tracking-tight text-zinc-100">
        {hideChecklist ? 'Games' : 'Tasks'}
      </h1>
      <TasksView
        allAttendees={allAttendees}
        groupOverview={groupOverview}
        snapshots={snapshots}
        me={me}
        hideChecklist={hideChecklist}
      />
    </div>
  );
}
