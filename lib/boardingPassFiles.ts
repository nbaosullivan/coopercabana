import fs from 'node:fs';
import path from 'node:path';
import { boardingPassCandidates, BoardingPassLeg } from './boardingPass';

/**
 * Server-only. Resolves the FIRST boarding pass file that actually exists on
 * disk for an attendee + leg, returning its gated URL (or null). Lets the
 * flights page know up-front whether a pass exists so the client never
 * renders a card (or flashes a broken image) for someone without one.
 * Mirrors the onError fallthrough order in the client component, so the two
 * never disagree about which file is the right one.
 */
export function resolveBoardingPass(
  attendeeId: string,
  leg: BoardingPassLeg
): string | null {
  const dir = path.join(process.cwd(), 'boarding');
  for (const url of boardingPassCandidates(attendeeId, leg)) {
    const file = url.replace(/^\/boarding\//, '');
    if (fs.existsSync(path.join(dir, file))) return url;
  }
  return null;
}

export function resolveBoardingPasses(
  attendeeId: string
): { outbound: string | null; return: string | null } {
  return {
    outbound: resolveBoardingPass(attendeeId, 'outbound'),
    return: resolveBoardingPass(attendeeId, 'return'),
  };
}
