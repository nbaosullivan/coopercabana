const EXTS = ['png', 'jpg', 'jpeg', 'webp'];

export type BoardingPassLeg = 'outbound' | 'return';

/**
 * Candidate URLs for an attendee's boarding pass image(s), most specific
 * first. Outbound falls back to a single combined pass (`<uuid>.<ext>`);
 * return does not, so a lone combined pass is shown exactly once.
 * Served through the gated /boarding route (app/boarding/[file]/route.ts),
 * never from the public CDN.
 */
export function boardingPassCandidates(
  attendeeId: string,
  leg: BoardingPassLeg
): string[] {
  const base = `/boarding/${attendeeId}`;
  const prefixes = leg === 'outbound' ? [`-outbound`, ''] : [`-return`];
  return prefixes.flatMap((p) => EXTS.map((ext) => `${base}${p}.${ext}`));
}
