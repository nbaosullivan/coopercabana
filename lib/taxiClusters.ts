import { PublicAttendee } from './types';

/**
 * Taxi Cluster / Shared Rides utility.
 *
 * Groups attendees into shared-ride pools by their flight times:
 *  - 'arrival'  mode clusters on outbound_arrival_time   (landing in Málaga)
 *  - 'departure' mode clusters on return_departure_time  (leaving Málaga)
 *
 * Greedy single-pass clustering: attendees sorted chronologically are added
 * to the current cluster while their time is within `windowMinutes` of the
 * cluster's FIRST member; otherwise a new cluster starts.
 */

export type ClusterMode = 'arrival' | 'departure';

export interface TaxiClusterMember {
  attendee: PublicAttendee;
  /** ISO timestamp this member clusters on. */
  time: string;
  /** Whole minutes after the cluster's first member (0 for the first). */
  minutesAfterFirst: number;
}

export interface TaxiCluster {
  id: number;
  mode: ClusterMode;
  members: TaxiClusterMember[];
  /** ISO timestamps of earliest / latest member. */
  firstTime: string;
  lastTime: string;
  /** e.g. "14:00 – 14:35" */
  windowLabel: string;
  /** e.g. "1x UberXL / Minivan" */
  vehicleLabel: string;
  /** Per member (index-aligned with members): gap note, null for the first. */
  gapNotes: (string | null)[];
}

export interface TaxiClustersResult {
  clusters: TaxiCluster[];
  /** Attendees with no valid time for the selected mode. */
  unassigned: PublicAttendee[];
}

const TIME_KEY: Record<ClusterMode, 'outbound_arrival_time' | 'return_departure_time'> = {
  arrival: 'outbound_arrival_time',
  departure: 'return_departure_time',
};

const FLIGHT_KEY: Record<ClusterMode, 'outbound_flight_details' | 'return_flight_details'> = {
  arrival: 'outbound_flight_details',
  departure: 'return_flight_details',
};

const VERB: Record<ClusterMode, 'lands' | 'departs'> = {
  arrival: 'lands',
  departure: 'departs',
};

export function vehicleForSize(n: number): string {
  if (n >= 9) return '2x Taxis / Private Coach';
  if (n >= 5) return '1x UberXL / Minivan';
  return '1x Standard Taxi / UberX';
}

function fmtHHMM(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function buildCluster(id: number, sorted: PublicAttendee[], mode: ClusterMode): TaxiCluster {
  const timeKey = TIME_KEY[mode];
  const flightKey = FLIGHT_KEY[mode];
  const first = sorted[0];
  const firstTime = first[timeKey]!;
  const firstTs = new Date(firstTime).getTime();

  const members: TaxiClusterMember[] = sorted.map((a) => ({
    attendee: a,
    time: a[timeKey]!,
    minutesAfterFirst: Math.round((new Date(a[timeKey]!).getTime() - firstTs) / 60000),
  }));

  const last = sorted[sorted.length - 1];
  const firstName = first.name.split(' ')[0];

  const gapNotes = members.map((m, i) => {
    if (i === 0) return null;
    const name = m.attendee.name.split(' ')[0];
    if (m.minutesAfterFirst === 0) {
      return `${name} ${VERB[mode]} at the same time as ${firstName}`;
    }
    return `${name} ${VERB[mode]} ${m.minutesAfterFirst} mins after ${firstName}`;
  });

  return {
    id,
    mode,
    members,
    firstTime,
    lastTime: last[timeKey]!,
    windowLabel: `${fmtHHMM(firstTime)} – ${fmtHHMM(last[timeKey]!)}`,
    vehicleLabel: vehicleForSize(sorted.length),
    gapNotes,
  };
}

export function getTaxiClusters(
  attendees: PublicAttendee[],
  windowMinutes = 45,
  mode: ClusterMode = 'arrival'
): TaxiClustersResult {
  const timeKey = TIME_KEY[mode];

  const unassigned: PublicAttendee[] = [];
  const withTime = attendees
    .filter((a) => {
      if (!a[timeKey]) {
        unassigned.push(a);
        return false;
      }
      return true;
    })
    .sort((a, b) => new Date(a[timeKey]!).getTime() - new Date(b[timeKey]!).getTime());

  const clusters: TaxiCluster[] = [];
  let current: PublicAttendee[] = [];
  let currentStartTs = 0;

  for (const a of withTime) {
    const ts = new Date(a[timeKey]!).getTime();
    if (current.length === 0) {
      current = [a];
      currentStartTs = ts;
      continue;
    }
    if (ts - currentStartTs <= windowMinutes * 60_000) {
      current.push(a);
    } else {
      clusters.push(buildCluster(clusters.length + 1, current, mode));
      current = [a];
      currentStartTs = ts;
    }
  }
  if (current.length > 0) {
    clusters.push(buildCluster(clusters.length + 1, current, mode));
  }

  return { clusters, unassigned };
}
