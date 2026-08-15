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
