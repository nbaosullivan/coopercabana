import type { AssassinPayload } from '@/lib/types';

export interface DealtMission {
  actor_id: string;
  arbiter_id: string; // the target confirms the claim
  payload: AssassinPayload;
}

type Rng = () => number;

/** Fisher-Yates, using an injectable RNG so tests are deterministic. */
function shuffle<T>(items: T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Draw `count` prompts, preferring distinct ones. Falls back to repeats when
 * the pool is smaller than the player count (a small pool is a content bug,
 * not a crash).
 */
function drawPrompts(pool: string[], count: number, rng: Rng): string[] {
  if (pool.length === 0) throw new Error('Prompt pool is empty');
  const out: string[] = [];
  let bag: string[] = [];
  for (let i = 0; i < count; i++) {
    if (bag.length === 0) bag = shuffle(pool, rng);
    out.push(bag.pop()!);
  }
  return out;
}

/**
 * Deal one Assassin round.
 *
 * Targets are assigned as a single random cycle: shuffle the players, then
 * point each at the next one, wrapping the last back to the first. This
 * guarantees (a) nobody hunts themselves, (b) everyone is hunted exactly once,
 * and (c) the chase is one connected loop rather than a set of mutual pairs.
 */
export function buildAssassinRound(
  playerIds: string[],
  actionPool: string[],
  locationPool: string[],
  rng: Rng = Math.random
): DealtMission[] {
  if (playerIds.length < 3) {
    throw new Error('Assassin needs at least 3 players');
  }
  const ring = shuffle(playerIds, rng);
  const actions = drawPrompts(actionPool, ring.length, rng);
  const locations = drawPrompts(locationPool, ring.length, rng);

  return ring.map((actorId, i) => ({
    actor_id: actorId,
    arbiter_id: ring[(i + 1) % ring.length],
    payload: {
      target_id: ring[(i + 1) % ring.length],
      action: actions[i],
      location: locations[i],
    },
  }));
}
