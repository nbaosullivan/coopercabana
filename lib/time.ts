/**
 * Format a Postgres/Supabase TIME value ("15:00:00" or "15:00") into a
 * readable 12-hour display string ("3:00pm").
 *
 * Returns null for null/undefined/empty input so callers can render nothing.
 * Also tolerates a full ISO timestamp string as a fallback.
 */
export function formatTime(value: string | null | undefined): string | null {
  if (!value) return null;

  // Extract HH:MM from "15:00", "15:00:00", or an ISO timestamp
  const m = /(\d{1,2}):(\d{2})/.exec(value);
  if (!m) return null;

  let hours = parseInt(m[1], 10);
  const minutes = m[2];

  const suffix = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  if (hours === 0) hours = 12;

  return `${hours}:${minutes}${suffix}`;
}

// ---------------------------------------------------------------------------
// Flight times are anchored to the event's location, not the viewer's device.
// Everyone flies into/out of Málaga, so a flight time entered as "14:30" means
// 14:30 in Málaga — regardless of where the person typing is sitting (UK, OZ,
// France). We store the absolute UTC instant whose Europe/Madrid wall clock
// matches what was typed, and we always render instants back in Europe/Madrid.
// This is DST-aware via Intl, so it stays right whether the trip is in summer
// (CEST, +02:00) or winter (CET, +01:00).
// ---------------------------------------------------------------------------

export const EVENT_TIME_ZONE = 'Europe/Madrid';

/**
 * UTC offset (minutes, + means ahead of UTC) of `timeZone` at the given
 * instant — DST-aware. E.g. +120 for Europe/Madrid in summer, +60 in winter.
 */
export function zoneOffsetMinutes(epoch: number | Date, timeZone = EVENT_TIME_ZONE): number {
  const date = typeof epoch === 'number' ? new Date(epoch) : epoch;
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  const asUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
  return Math.round((asUTC - date.getTime()) / 60000);
}

/**
 * Convert a wall-clock date + time ("2026-09-01", "14:30") typed into the form
 * into the UTC ISO instant whose wall clock in `timeZone` (default: Málaga)
 * matches. Independent of the typist's own browser timezone — this is the fix
 * for flight times being stored differently per user.
 *
 * IMPORTANT: do NOT build the naive instant with `new Date(\`${date}T${time}\`)`
 * — that applies the device's local zone and re-introduces the bug. Parse the
 * parts and treat them as a nominal UTC wall clock, then shift by the zone
 * offset.
 */
export function wallClockToISO(date: string, time: string, timeZone = EVENT_TIME_ZONE): string {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const nominalUTC = Date.UTC(y, mo - 1, d, h, mi, 0);
  const offsetMin = zoneOffsetMinutes(nominalUTC, timeZone);
  return new Date(nominalUTC - offsetMin * 60000).toISOString();
}

/**
 * Split an ISO instant into `{ date: "YYYY-MM-DD", time: "HH:mm" }` expressed
 * in `timeZone` (default: Málaga) — used to prefill the edit form so what a
 * user typed before is shown back as the same wall clock, not shifted to their
 * current device zone.
 */
export function toZoneParts(
  iso: string | null,
  timeZone = EVENT_TIME_ZONE
): { date: string; time: string } {
  if (!iso) return { date: '', time: '' };
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = dtf.formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
}

/**
 * Format an ISO instant for display, always in the event zone (Málaga), never
 * the viewer's. Pass the usual Intl.DateTimeFormat options (weekday, day,
 * month, hour, minute...).
 */
export function formatZoned(iso: string, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: EVENT_TIME_ZONE,
    ...options,
  }).format(new Date(iso));
}
