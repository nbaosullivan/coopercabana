'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Clock, Navigation } from 'lucide-react';
import { PublicAttendee } from '@/lib/types';
import { ClusterMode, TaxiCluster, getTaxiClusters } from '@/lib/taxiClusters';
import { formatZoned } from '@/lib/time';
import { useUser } from './UserProvider';

const WINDOWS = [30, 45, 60];

const VILLA = 'Calle Benalmádena 12, Málaga';
const AIRPORT = 'Málaga Airport (AGP), Málaga';

function fmtDayTime(iso: string): string {
  return formatZoned(iso, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtTime(iso: string): string {
  return formatZoned(iso, { hour: '2-digit', minute: '2-digit' });
}

function clusterEmoji(cluster: TaxiCluster): string {
  const n = cluster.members.length;
  if (n === 1) return '🚗';
  if (n >= 9) return '🚌';
  if (n >= 5) return '🚐';
  return '🚕';
}

function clusterName(cluster: TaxiCluster): string {
  const n = cluster.members.length;
  if (n === 1) return 'Solo Ride';
  if (n >= 9) return `Coach Pool ${cluster.id}`;
  if (n >= 5) return `Van Pool ${cluster.id}`;
  return `Taxi Pool ${cluster.id}`;
}

function vehicleNoun(cluster: TaxiCluster): string {
  const n = cluster.members.length;
  if (n >= 9) return 'a private coach';
  if (n >= 5) return 'an UberXL';
  return 'a taxi / UberX';
}

function uberShareLink(mode: ClusterMode): string {
  const pickup = mode === 'arrival' ? AIRPORT : VILLA;
  const dropoff = mode === 'arrival' ? VILLA : AIRPORT;
  return (
    `https://m.uber.com/ul/?action=setPickup` +
    `&pickup[formatted_address]=${encodeURIComponent(pickup)}` +
    `&dropoff[formatted_address]=${encodeURIComponent(dropoff)}`
  );
}

function ClusterCard({
  cluster,
  mode,
  windowMinutes,
  currentUserId,
}: {
  cluster: TaxiCluster;
  mode: ClusterMode;
  windowMinutes: number;
  currentUserId?: string;
}) {
  const size = cluster.members.length;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-100">
          {clusterEmoji(cluster)} {clusterName(cluster)}
        </p>
        <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
          {size} {size === 1 ? 'Person' : 'People'} • {cluster.vehicleLabel}
        </span>
      </div>

      {/* Time span banner */}
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-medium tabular-nums text-zinc-300">
        <Clock className="h-3.5 w-3.5 text-emerald-500" />
        {cluster.windowLabel}
      </div>

      {/* Attendees */}
      <div className="mt-3 space-y-2">
        {cluster.members.map((m, i) => {
          const isYou = m.attendee.id === currentUserId;
          return (
            <div
              key={m.attendee.id}
              className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${
                isYou
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : 'border-zinc-800 bg-zinc-950'
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-100">
                  {m.attendee.name}
                  {isYou && (
                    <span className="ml-1.5 rounded bg-emerald-500 px-1 py-0.5 align-middle text-[10px] font-bold text-cream">
                      You
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-zinc-500">
                  {mode === 'arrival'
                    ? m.attendee.outbound_flight_details
                    : m.attendee.return_flight_details}
                  {cluster.gapNotes[i] && (
                    <span className="text-amber-400/80"> • {cluster.gapNotes[i]}</span>
                  )}
                </p>
              </div>
              <p className="shrink-0 text-right">
                <span className="block text-sm font-semibold tabular-nums text-zinc-300">
                  {fmtTime(m.time)}
                </span>
                <span className="block text-[10px] text-zinc-600">
                  {fmtDayTime(m.time).split(',')[0]}
                </span>
              </p>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="mt-4">
        <a
          href={uberShareLink(mode)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-cream transition active:scale-[0.98]"
        >
          <Navigation className="h-4 w-4" /> Order Shared Uber
        </a>
      </div>
    </div>
  );
}

export default function TaxiClusters({ attendees }: { attendees: PublicAttendee[] }) {
  const { user } = useUser();
  const [mode, setMode] = useState<ClusterMode>('arrival');
  const [windowMinutes, setWindowMinutes] = useState(45);
  const [showUnassigned, setShowUnassigned] = useState(false);

  const { clusters, unassigned } = useMemo(
    () => getTaxiClusters(attendees, windowMinutes, mode),
    [attendees, windowMinutes, mode]
  );

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Taxi clusters — share rides
      </h2>

      {/* Arrivals / Departures toggle */}
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
        {(
          [
            ['arrival', '🛬 Landing in Málaga'],
            ['departure', '🛫 Departing Málaga'],
          ] as [ClusterMode, string][]
        ).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              mode === m ? 'bg-emerald-500 text-cream' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Window pills */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">Group within</span>
        {WINDOWS.map((w) => (
          <button
            key={w}
            onClick={() => setWindowMinutes(w)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              windowMinutes === w
                ? 'bg-emerald-500 text-cream'
                : 'border border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {w}m
          </button>
        ))}
        {windowMinutes !== 45 && (
          <span className="text-xs text-zinc-600">default 45m</span>
        )}
      </div>

      {/* Clusters */}
      {clusters.length === 0 ? (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-center text-sm text-zinc-500">
          {mode === 'arrival'
            ? 'No arrival times yet — add your outbound flight details above to see taxi pools.'
            : 'No return times yet — add your return flight details above to see taxi pools.'}
        </p>
      ) : (
        clusters.map((cluster) => (
          <ClusterCard
            key={cluster.id}
            cluster={cluster}
            mode={mode}
            windowMinutes={windowMinutes}
            currentUserId={user?.id}
          />
        ))
      )}

      {/* Unassigned */}
      {unassigned.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
          <button
            onClick={() => setShowUnassigned((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3.5"
          >
            <span className="text-sm font-medium text-zinc-400">
              ✈️ Flights missing ({unassigned.length})
            </span>
            <ChevronDown
              className={`h-4 w-4 text-zinc-500 transition-transform ${
                showUnassigned ? 'rotate-180' : ''
              }`}
            />
          </button>
          {showUnassigned && (
            <div className="border-t border-zinc-800">
              {unassigned.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-2.5 text-sm last:border-0"
                >
                  <span className="text-zinc-300">{a.name}</span>
                  <span className="text-xs text-zinc-600">
                    {mode === 'arrival' ? 'No outbound flight' : 'No return flight'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
