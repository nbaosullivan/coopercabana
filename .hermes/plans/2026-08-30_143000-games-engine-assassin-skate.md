# Stag Games Engine (Assassin + SKATE) Implementation Plan

> **For Hermes:** implement task-by-task. Fresh subagent per task where useful, two-stage review (spec compliance, then code quality). Commit after every task.

**Goal:** Add a flexible "Games" system to the Tasks section of the Coopercabana stag app, with two concrete games on top of one generic engine: **Assassin** (secret name + action + location missions, played all day, resolved by target confirmation) and **SKATE** (a player sets a physical challenge, anyone who ducks it collects a letter).

**Architecture:** One generic, kind-agnostic engine in Postgres (`games`, `game_rounds`, `game_assignments`, `game_players`, `game_events`, `game_prompts`) plus a client-side **game kind registry** (`lib/games/registry.ts`) mapping `kind -> { label, icon, PlayerView, AdminView }`. Adding a third game later = one new SQL `kind` value, one assignment generator, two React views, one registry entry. No engine changes.

**Delivery:** in-app only for now (no Web Push). "Delivery" = an unseen-assignment badge on the Tasks tab plus a full-screen briefing modal the first time a player opens it. Web Push is designed for but deliberately out of scope (see Phase 7 / Deferred).

**Tech Stack:** Next.js 14 App Router, React 18, server actions, Tailwind, lucide-react, Supabase Postgres with the existing in-memory mock fallback (`lib/mockData.ts`), Vitest for pure logic.

**Confirmed decisions (from Nick, 30 Aug 2026):**
1. Assassin claims are resolved by the **target confirming** they were duped (admin override available).
2. Rounds are **admin-triggered**. Normally one round for the day, but the engine supports N rounds.
3. **In-app delivery only.** No push infrastructure.
4. Build the **generic engine + both games fully**.
5. Mission content pools are **admin-editable in the app**, seeded with a starter list.
6. **No RLS lockdown.** Game tables get permissive policies like every other table in this app. Mission secrecy is enforced by the server actions redacting what they return, not by the database. Accepted: a player with devtools and the anon key could read raw rows. This is a four-man stag group, not a threat model.
7. **SKATE is classic**: the setter must land their own challenge first. If they miss it, the set is void and **nobody collects a letter - least of all the setter**. Blowing your own set costs you nothing but the turn. The setter is never issued an assignment for their own set, so there is no code path by which they can be lettered by it. A player can only ever collect a letter by failing to match *someone else's* successfully-landed challenge.
8. **Assassin score persists across rounds** within one game.
9. **Dealing a new Assassin round voids only unclaimed (`active`) missions.** Anything already `claimed` stays open so a slow target can still confirm it and the hunter keeps the point they earned.

---

## Current context

Read before starting:

- `schema.sql` - single-file Supabase schema + seed, drops and recreates tables. New tables append here.
- `lib/types.ts:1-91` - all shared types, `stripPin` helper, `LANDING_PAGES`.
- `lib/db.ts:1-202` - the ONLY place that knows about Supabase vs mock. Every function branches on `isSupabaseConfigured && supabase`, else falls through to `mockDb`.
- `lib/mockData.ts` - the in-memory store used when `.env.local` has no Supabase keys. **Every new table needs a mock array here or local dev breaks.**
- `app/actions.ts:1-191` - all server actions, `'use server'` at top, `revalidatePath` after every mutation.
- `components/TasksView.tsx:1-121` - the current Tasks screen (t-shirt size, flights toggle, admin dashboard). Games get added below these, not instead of them.
- `components/BottomNav.tsx:1-43` - 4 tabs, active tab tinted `text-emerald-500`.
- `components/UserProvider.tsx` - `useUser()` gives `{ user, setUser }`, `user.is_admin` gates admin UI.
- `lib/session.ts` - httpOnly cookie `stag_user_id` is the identity. **All authorisation must be server-side from `getSessionAttendeeId()`, never from a client-passed `attendeeId`.**

**Existing style conventions to match:** `rounded-2xl border border-zinc-800 bg-zinc-900 p-5` cards, `text-sm font-semibold text-zinc-200` section headings, `emerald-500` for affirmative/active, `red-400` for negative, `useTransition` for server-action pending state, lucide icons at `h-3.5 w-3.5` (inline) or `h-6 w-6` (nav).

### Security note that applies to the whole plan

The existing actions accept `attendeeId` from the client (e.g. `updateTshirtSize(user.id, size)`). That is tolerable for t-shirt sizes. It is **not** tolerable for Assassin, where the whole game is spoiled if a player can query someone else's mission. Every new server action in this plan must:

1. Call `getSessionAttendeeId()` itself and use that as the actor.
2. Never accept an `actorId` argument from the client.
3. Never return another player's `payload` for a `private` assignment.

---

## Data model

### Concepts

| Concept | Table | Assassin meaning | SKATE meaning |
|---|---|---|---|
| Game | `games` | "Assassin - Day 2" | "SKATE - the weekend" |
| Player | `game_players` | a hunter/target, holds `score` | a player, holds `letters` |
| Round | `game_rounds` | one deal of missions | one "set" (a challenge someone called) |
| Assignment | `game_assignments` | your secret mission | your obligation to match the set |
| Prompt | `game_prompts` | the action/location pools | (unused, or a bank of challenge ideas) |
| Event | `game_events` | append-only audit/feed | append-only audit/feed |

The two games differ only in: the shape of `assignment.payload`, `assignment.visibility`, who may resolve an assignment, and what a resolution does to `player.state`.

### SQL (append to `schema.sql`)

```sql
-- ===========================================================================
-- GAMES ENGINE
-- Generic scaffolding shared by every mini-game. A game "kind" is just a
-- string; the app layer knows how to render and resolve each one.
-- ===========================================================================

DROP TABLE IF EXISTS game_events;
DROP TABLE IF EXISTS game_assignments;
DROP TABLE IF EXISTS game_rounds;
DROP TABLE IF EXISTS game_players;
DROP TABLE IF EXISTS game_prompts;
DROP TABLE IF EXISTS games;

-- A single instance of a mini-game.
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('assassin', 'skate')),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'ended')),
  -- Kind-specific settings. assassin: {}, skate: { "word": "SKATE" }
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES attendees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

-- Who is in a game, and their running state.
-- assassin: { "score": 0 }   skate: { "letters": "SK" }
CREATE TABLE game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  attendee_id UUID NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_out BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, attendee_id)
);

-- A unit of play. assassin: one deal of missions. skate: one "set".
-- skate payload: { "setter_id": "...", "challenge": "30 push ups",
--                  "phase": "setting" | "chasing", "setter_landed": true|false|null }
CREATE TABLE game_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  UNIQUE (game_id, round_number)
);

-- One player's obligation inside a round. THE core table.
-- assassin payload: { "target_id": "...", "action": "moon someone",
--                     "location": "in a crowd" }   visibility 'private'
-- skate payload:    { "challenge": "30 push ups" } visibility 'public'
CREATE TABLE game_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES game_rounds(id) ON DELETE CASCADE,
  -- The player who must DO something.
  actor_id UUID NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
  -- Who is allowed to confirm/deny a claim. assassin: the target.
  -- skate: the setter. NULL = admin-only resolution.
  arbiter_id UUID REFERENCES attendees(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'claimed', 'succeeded', 'failed', 'disputed', 'void')),
  claim_note TEXT,
  seen_at TIMESTAMPTZ,      -- powers the "new mission" badge + briefing modal
  claimed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES attendees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX game_assignments_actor_idx ON game_assignments (actor_id, status);
CREATE INDEX game_assignments_arbiter_idx ON game_assignments (arbiter_id, status);
CREATE INDEX game_assignments_round_idx ON game_assignments (round_id);

-- Append-only feed. Drives the "what's happening" ticker and is the audit
-- trail when someone insists they definitely did the thing.
CREATE TABLE game_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round_id UUID REFERENCES game_rounds(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES game_assignments(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES attendees(id) ON DELETE SET NULL,
  type TEXT NOT NULL,     -- game_started | round_opened | claimed | confirmed
                          -- | denied | letter_given | admin_override | game_ended
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- FALSE while it would spoil a live mission; flipped TRUE on resolution.
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX game_events_game_idx ON game_events (game_id, created_at DESC);

-- Admin-editable content pools. Assassin draws one 'action' + one 'location'.
CREATE TABLE game_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL DEFAULT 'assassin',
  category TEXT NOT NULL CHECK (category IN ('action', 'location', 'challenge')),
  text TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX game_prompts_pool_idx ON game_prompts (kind, category, is_active);
```

Seed (also append to `schema.sql`). Keep it clean-ish; Nick can edit in-app later.

```sql
INSERT INTO game_prompts (kind, category, text) VALUES
('assassin', 'action', 'Do ten press-ups'),
('assassin', 'action', 'Sing a full chorus out loud'),
('assassin', 'action', 'Do their best worm impression on the floor'),
('assassin', 'action', 'Speak in an American accent for a full minute'),
('assassin', 'action', 'Order a drink they have never had before'),
('assassin', 'action', 'Give a stranger a compliment about their shoes'),
('assassin', 'action', 'Take their shirt off'),
('assassin', 'action', 'Do a handstand against a wall'),
('assassin', 'action', 'Attempt to speak Spanish to a local for 30 seconds'),
('assassin', 'action', 'Carry someone on their back for ten paces'),
('assassin', 'action', 'Do the Macarena, all the way through'),
('assassin', 'action', 'Down a drink in one'),
('assassin', 'location', 'in a crowd'),
('assassin', 'location', 'in or beside the pool'),
('assassin', 'location', 'in a taxi'),
('assassin', 'location', 'at a bar, while ordering'),
('assassin', 'location', 'on the beach'),
('assassin', 'location', 'in the villa kitchen'),
('assassin', 'location', 'within sight of a member of staff'),
('assassin', 'location', 'on a balcony or terrace'),
('assassin', 'location', 'while everyone is sat down eating'),
('assassin', 'location', 'in the street, in daylight');

INSERT INTO game_prompts (kind, category, text) VALUES
('skate', 'challenge', '30 press-ups'),
('skate', 'challenge', '20 burpees'),
('skate', 'challenge', 'Hold a plank for 90 seconds'),
('skate', 'challenge', '15 pull-ups on anything solid'),
('skate', 'challenge', 'Down a pint of water in 10 seconds');
```

RLS (append with the other policies). Permissive, mirroring every other table in this app - see decision 6. Mission secrecy is a server-actions concern, not a database one:

```sql
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read/write games" ON games FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public read/write game_players" ON game_players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public read/write game_rounds" ON game_rounds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public read/write game_assignments" ON game_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public read/write game_events" ON game_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public read/write game_prompts" ON game_prompts FOR ALL USING (true) WITH CHECK (true);
```

> The existing `supabase` client from `lib/supabase.ts` is used throughout. No service-role client, no new env var. The redaction rules in Task 9 remain mandatory regardless - they are what stops the *app* leaking missions, which is the realistic failure mode.

---

## Phase 0: foundations

### Task 1: Add Vitest for pure logic

**Objective:** Get a test runner in place so the two genuinely tricky algorithms (Assassin target derangement, SKATE letter progression) are provable rather than hopeful.

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

**Step 1:** `npm i -D vitest @vitejs/plugin-react`

**Step 2:** Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

**Step 3:** Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  test: { environment: 'node', include: ['lib/**/*.test.ts'] },
});
```

**Step 4:** Verify: `npm test` -> "No test files found" (exit 0 is fine, or 1 with a clear message).

**Step 5:** Commit `chore: add vitest for pure logic tests`.

### Task 2: Confirm the Supabase client is fine as-is

**Objective:** Sanity-check, not a change. Per decision 6 there is no service-role client.

**Files:** Read `lib/supabase.ts` only.

**Steps:** Confirm it exports `supabase` and `isSupabaseConfigured`. `lib/games/db.ts` will import exactly those, same as `lib/db.ts` does. No code change expected. If `lib/supabase.ts` turns out not to export both, note the actual names and use them consistently.

**Verify:** `npm run build` still passes.
**Commit:** none (no change).

---

## Phase 1: types and the kind registry

### Task 3: Add engine types to `lib/types.ts`

**Objective:** One vocabulary for both games.

**Files:** Modify `lib/types.ts` (append at end, before `stripPin`).

```ts
// --- Games engine ---------------------------------------------------------

export const GAME_KINDS = ['assassin', 'skate'] as const;
export type GameKind = (typeof GAME_KINDS)[number];

export type GameStatus = 'draft' | 'active' | 'ended';
export type RoundStatus = 'open' | 'closed';
export type AssignmentStatus =
  | 'active'
  | 'claimed'
  | 'succeeded'
  | 'failed'
  | 'disputed'
  | 'void';
export type AssignmentVisibility = 'private' | 'public';
export type PromptCategory = 'action' | 'location' | 'challenge';

export interface Game {
  id: string;
  kind: GameKind;
  title: string;
  status: GameStatus;
  config: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface GamePlayer {
  id: string;
  game_id: string;
  attendee_id: string;
  state: Record<string, unknown>;
  is_out: boolean;
  joined_at: string;
}

export interface GameRound {
  id: string;
  game_id: string;
  round_number: number;
  status: RoundStatus;
  payload: Record<string, unknown>;
  created_at: string;
  closed_at: string | null;
}

export interface GameAssignment {
  id: string;
  game_id: string;
  round_id: string;
  actor_id: string;
  arbiter_id: string | null;
  payload: Record<string, unknown>;
  visibility: AssignmentVisibility;
  status: AssignmentStatus;
  claim_note: string | null;
  seen_at: string | null;
  claimed_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export interface GameEvent {
  id: string;
  game_id: string;
  round_id: string | null;
  assignment_id: string | null;
  actor_id: string | null;
  type: string;
  payload: Record<string, unknown>;
  is_public: boolean;
  created_at: string;
}

export interface GamePrompt {
  id: string;
  kind: string;
  category: PromptCategory;
  text: string;
  is_active: boolean;
  created_at: string;
}

// --- Kind-specific payload shapes ----------------------------------------

export interface AssassinPayload {
  target_id: string;
  action: string;
  location: string;
}

export interface AssassinPlayerState {
  score: number;
}

export interface SkateRoundPayload {
  setter_id: string;
  challenge: string;
  /**
   * 'setting'  - the setter is attempting their own challenge; nobody else
   *              has an assignment yet.
   * 'chasing'  - the setter landed it; everyone else must now match it.
   */
  phase: 'setting' | 'chasing';
  /** null while phase is 'setting'. false ends the round with no letters. */
  setter_landed: boolean | null;
}

export interface SkatePlayerState {
  letters: string; // e.g. "SK"
}

// --- Client-facing view models -------------------------------------------

/** Everything one player needs to render their view of one game. */
export interface GameSnapshot {
  game: Game;
  players: Array<{
    attendee: PublicAttendee;
    state: Record<string, unknown>;
    is_out: boolean;
  }>;
  currentRound: GameRound | null;
  /** The signed-in player's own assignment for the current round. */
  myAssignment: GameAssignment | null;
  /** Assignments awaiting THIS player's confirmation as arbiter. */
  awaitingMyVerdict: GameAssignment[];
  /** Public assignments (SKATE) for the current round. Never private ones. */
  publicAssignments: GameAssignment[];
  /** Most recent public events, newest first, capped at 30. */
  feed: GameEvent[];
  /** True when the player has an assignment they have not opened yet. */
  hasUnseen: boolean;
}
```

**Verify:** `npx tsc --noEmit`.
**Commit:** `feat(types): add games engine types`.

### Task 4: Create the kind registry skeleton

**Objective:** The single extension point. Adding a game later touches this file and nothing else in the engine.

**Files:** Create `lib/games/registry.ts`.

```ts
import type { ComponentType } from 'react';
import type { GameKind, GameSnapshot, PublicAttendee } from '@/lib/types';

export interface GameViewProps {
  snapshot: GameSnapshot;
  me: PublicAttendee;
  allAttendees: PublicAttendee[];
}

export interface GameKindDefinition {
  kind: GameKind;
  label: string;
  /** One line shown on the admin "new game" picker. */
  blurb: string;
  /** lucide-react icon name, resolved by the consuming component. */
  icon: string;
  /** What the admin's "new round" button says for this kind. */
  newRoundLabel: string;
  PlayerView: ComponentType<GameViewProps>;
  AdminView: ComponentType<GameViewProps>;
}

const registry = new Map<GameKind, GameKindDefinition>();

export function registerGameKind(def: GameKindDefinition) {
  registry.set(def.kind, def);
}

export function getGameKind(kind: GameKind): GameKindDefinition | undefined {
  return registry.get(kind);
}

export function listGameKinds(): GameKindDefinition[] {
  return [...registry.values()];
}
```

> Registration happens in `components/games/index.ts` (Task 15) which imports both game modules for their side effects. Keep `registry.ts` free of React imports beyond the type so it stays importable from server code.

**Commit:** `feat(games): add game kind registry`.

---

## Phase 2: the assignment algorithms (TDD, the risky part)

### Task 5: Assassin target derangement - failing test first

**Objective:** Deal targets so nobody hunts themselves and the graph is one big cycle (so the game cannot fragment into two people chasing each other while the rest idle).

**Files:**
- Create: `lib/games/assassin.test.ts`
- Create: `lib/games/assassin.ts` (empty for now)

**Step 1:** Write `lib/games/assassin.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildAssassinRound } from './assassin';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);
const actions = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'];
const locations = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'];

describe('buildAssassinRound', () => {
  it('gives every player exactly one mission', () => {
    const r = buildAssassinRound(ids(6), actions, locations, () => 0.5);
    expect(r).toHaveLength(6);
    expect(new Set(r.map((m) => m.actor_id)).size).toBe(6);
  });

  it('never targets a player at themselves', () => {
    for (let seed = 0; seed < 50; seed++) {
      const r = buildAssassinRound(ids(8), actions, locations);
      for (const m of r) expect(m.payload.target_id).not.toBe(m.actor_id);
    }
  });

  it('targets form a single cycle covering everyone', () => {
    const players = ids(7);
    const r = buildAssassinRound(players, actions, locations);
    const next = new Map(r.map((m) => [m.actor_id, m.payload.target_id]));
    let cur = players[0];
    const seen = new Set<string>();
    for (let i = 0; i < players.length; i++) {
      expect(seen.has(cur)).toBe(false);
      seen.add(cur);
      cur = next.get(cur)!;
    }
    expect(cur).toBe(players[0]);
    expect(seen.size).toBe(players.length);
  });

  it('every player is targeted exactly once', () => {
    const r = buildAssassinRound(ids(9), actions, locations);
    expect(new Set(r.map((m) => m.payload.target_id)).size).toBe(9);
  });

  it('prefers distinct actions when the pool is big enough', () => {
    const r = buildAssassinRound(ids(6), actions, locations);
    expect(new Set(r.map((m) => m.payload.action)).size).toBe(6);
  });

  it('reuses prompts without crashing when the pool is too small', () => {
    const r = buildAssassinRound(ids(6), ['only one'], ['here'], undefined);
    expect(r).toHaveLength(6);
    expect(r.every((m) => m.payload.action === 'only one')).toBe(true);
  });

  it('throws below three players', () => {
    expect(() => buildAssassinRound(ids(2), actions, locations)).toThrow(/at least 3/i);
  });
});
```

**Step 2:** Run `npm test` -> FAIL, "buildAssassinRound is not a function".

**Step 3:** Implement `lib/games/assassin.ts`:

```ts
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
```

**Step 4:** `npm test` -> all 7 pass.
**Step 5:** Commit `feat(games): assassin round dealer with cycle guarantee`.

> Note the deliberate design choice: `arbiter_id === target_id`. The target is the one who confirms. This satisfies the confirmation decision and means the engine's generic arbiter field needs no special-casing.

### Task 6: SKATE letter logic - failing test first

**Objective:** Letters, elimination, and winner detection, configurable word.

**Files:**
- Create: `lib/games/skate.test.ts`
- Create: `lib/games/skate.ts`

**Step 1:** Write `lib/games/skate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { addLetter, isEliminated, skateStandings, skateChasers } from './skate';

describe('addLetter', () => {
  it('adds the next letter of the word', () => {
    expect(addLetter('', 'SKATE')).toBe('S');
    expect(addLetter('S', 'SKATE')).toBe('SK');
    expect(addLetter('SKAT', 'SKATE')).toBe('SKATE');
  });
  it('is a no-op once the word is complete', () => {
    expect(addLetter('SKATE', 'SKATE')).toBe('SKATE');
  });
  it('honours a custom word', () => {
    expect(addLetter('C', 'COOPS')).toBe('CO');
  });
});

describe('isEliminated', () => {
  it('is true only on a full word', () => {
    expect(isEliminated('SKAT', 'SKATE')).toBe(false);
    expect(isEliminated('SKATE', 'SKATE')).toBe(true);
  });
});

describe('skateStandings', () => {
  it('sorts fewest letters first, then alphabetically by name', () => {
    const rows = skateStandings(
      [
        { attendeeId: 'b', name: 'Bob', letters: 'SK' },
        { attendeeId: 'a', name: 'Al', letters: '' },
        { attendeeId: 'c', name: 'Cy', letters: 'SKATE' },
      ],
      'SKATE'
    );
    expect(rows.map((r) => r.attendeeId)).toEqual(['a', 'b', 'c']);
    expect(rows[2].isOut).toBe(true);
  });
  it('names a winner when exactly one player survives', () => {
    const rows = skateStandings(
      [
        { attendeeId: 'a', name: 'Al', letters: 'SKAT' },
        { attendeeId: 'b', name: 'Bob', letters: 'SKATE' },
      ],
      'SKATE'
    );
    expect(rows.find((r) => r.isWinner)?.attendeeId).toBe('a');
  });
  it('names no winner while two or more survive', () => {
    const rows = skateStandings(
      [
        { attendeeId: 'a', name: 'Al', letters: '' },
        { attendeeId: 'b', name: 'Bob', letters: 'S' },
      ],
      'SKATE'
    );
    expect(rows.some((r) => r.isWinner)).toBe(false);
  });
});

// The setter-never-lettered invariant (decision 7), made provable rather than
// left as a code-review comment.
describe('skateChasers', () => {
  const players = [
    { attendeeId: 'setter', isOut: false },
    { attendeeId: 'a', isOut: false },
    { attendeeId: 'b', isOut: false },
    { attendeeId: 'gone', isOut: true },
  ];

  it('issues assignments to everyone except the setter and the eliminated', () => {
    expect(skateChasers(players, 'setter')).toEqual(['a', 'b']);
  });

  it('never includes the setter, so they cannot be lettered by their own set', () => {
    for (const id of ['setter', 'a', 'b']) {
      expect(skateChasers(players, id)).not.toContain(id);
    }
  });

  it('returns nobody when the setter is the only one left', () => {
    expect(skateChasers([{ attendeeId: 'setter', isOut: false }], 'setter')).toEqual([]);
  });
});
```

**Step 2:** Run -> FAIL.

**Step 3:** Implement `lib/games/skate.ts`:

```ts
export const DEFAULT_SKATE_WORD = 'SKATE';

/** Append the next letter of `word`. Idempotent once the word is complete. */
export function addLetter(letters: string, word = DEFAULT_SKATE_WORD): string {
  if (letters.length >= word.length) return word;
  return word.slice(0, letters.length + 1);
}

export function isEliminated(letters: string, word = DEFAULT_SKATE_WORD): boolean {
  return letters.length >= word.length;
}

export interface SkateStandingInput {
  attendeeId: string;
  name: string;
  letters: string;
}

export interface SkateStandingRow extends SkateStandingInput {
  isOut: boolean;
  isWinner: boolean;
}

export function skateStandings(
  rows: SkateStandingInput[],
  word = DEFAULT_SKATE_WORD
): SkateStandingRow[] {
  const survivors = rows.filter((r) => !isEliminated(r.letters, word));
  const winnerId = survivors.length === 1 ? survivors[0].attendeeId : null;

  return [...rows]
    .map((r) => ({
      ...r,
      isOut: isEliminated(r.letters, word),
      isWinner: r.attendeeId === winnerId,
    }))
    .sort(
      (a, b) => a.letters.length - b.letters.length || a.name.localeCompare(b.name)
    );
}

/**
 * Who must chase a landed set: every live player EXCEPT the setter.
 *
 * This is the single source of truth for the classic-SKATE invariant that a
 * setter can never collect a letter from their own challenge. Because they are
 * never issued an assignment, there is no row for `reportSkateAttempt` to fail
 * and therefore no path to `addLetter` for them. `reportSetterAttempt` handles
 * the setter's own go, and its miss branch gives out no letters at all.
 *
 * Always route assignment creation through this function - never filter the
 * player list inline at the call site.
 */
export function skateChasers(
  players: Array<{ attendeeId: string; isOut: boolean }>,
  setterId: string
): string[] {
  return players
    .filter((p) => !p.isOut && p.attendeeId !== setterId)
    .map((p) => p.attendeeId);
}
```

**Step 4:** `npm test` -> all pass (Assassin's 7 + SKATE's 9).
**Step 5:** Commit `feat(games): skate letter, standings and chaser logic`.

---

## Phase 3: data access

### Task 7: Mock store for the game tables

**Objective:** Local dev without Supabase keys must fully work, including a playable game. Do this **before** `db.ts` so every db function can be written against both paths at once.

**Files:** Modify `lib/mockData.ts`.

**Steps:** Read the existing `mockDb` shape first, then extend it in the same style:

```ts
games: [] as Game[],
gamePlayers: [] as GamePlayer[],
gameRounds: [] as GameRound[],
gameAssignments: [] as GameAssignment[],
gameEvents: [] as GameEvent[],
gamePrompts: [ /* the same seed rows as schema.sql, with generated ids */ ] as GamePrompt[],
```

Add a tiny id helper if the file does not already have one:

```ts
let mockSeq = 0;
export const mockId = (prefix: string) => `${prefix}-${++mockSeq}`;
```

**Pitfall:** mock rows are shared module state and survive across requests in dev but reset on server restart. That is fine and matches how the existing mock behaves; do not try to persist it.

**Verify:** `npx tsc --noEmit`.
**Commit:** `feat(games): mock store for game tables`.

### Task 8: `lib/games/db.ts` - the data-access layer

**Objective:** All game SQL in one file, dual-backend like `lib/db.ts`. Kept separate from `lib/db.ts` because it is roughly as long as that whole file.

**Files:** Create `lib/games/db.ts`.

Functions to implement (each branching Supabase / mock exactly like `lib/db.ts:20-27` does):

```ts
// Reads
getGames(): Promise<Game[]>                                  // newest first
getGameById(id): Promise<Game | null>
getActiveGames(): Promise<Game[]>                            // status = 'active'
getGamePlayers(gameId): Promise<GamePlayer[]>
getRounds(gameId): Promise<GameRound[]>                      // round_number asc
getCurrentRound(gameId): Promise<GameRound | null>           // highest round_number
getAssignmentsForRound(roundId): Promise<GameAssignment[]>
getAssignmentById(id): Promise<GameAssignment | null>
getAssignmentsForActor(gameId, actorId): Promise<GameAssignment[]>
getAssignmentsForArbiter(arbiterId, status): Promise<GameAssignment[]>
getEvents(gameId, limit): Promise<GameEvent[]>               // public only, newest first
getPrompts(kind, category?): Promise<GamePrompt[]>

// Writes
createGame(input): Promise<Game>
updateGameStatus(gameId, status): Promise<Game>
addPlayers(gameId, attendeeIds, initialState): Promise<GamePlayer[]>
updatePlayerState(gameId, attendeeId, patch): Promise<GamePlayer>  // shallow merge
setPlayerOut(gameId, attendeeId, isOut): Promise<GamePlayer>
createRound(gameId, roundNumber, payload): Promise<GameRound>
closeRound(roundId): Promise<GameRound>
createAssignments(rows): Promise<GameAssignment[]>           // bulk insert
updateAssignment(id, patch): Promise<GameAssignment>
markAssignmentSeen(id): Promise<void>                        // only if seen_at IS NULL
logEvent(input): Promise<GameEvent>
createPrompt(kind, category, text): Promise<GamePrompt>
setPromptActive(id, isActive): Promise<GamePrompt>
deletePrompt(id): Promise<void>
```

**Rules:**
- Every write returns the updated row (matches `lib/db.ts` convention).
- `updatePlayerState` must read-modify-write with a shallow merge so a score bump does not clobber `letters`.
- Never `select('*')` a private assignment into a function the client will see; filtering happens in the actions layer (Task 9), but keep the seam obvious.
- Use `supabaseAdmin` from Task 2 for these tables, not the anon client.

**Verify:** `npx tsc --noEmit` and `npm run build`.
**Commit:** `feat(games): data access layer`.

---

## Phase 4: server actions (the security boundary)

### Task 9: `app/games/actions.ts` - read path

**Objective:** Build `GameSnapshot` for the signed-in user with private data correctly redacted.

**Files:** Create `app/games/actions.ts` (starts with `'use server'`).

```ts
export async function getGameSnapshot(gameId: string): Promise<GameSnapshot | null>
export async function getActiveGameSnapshots(): Promise<GameSnapshot[]>
export async function markMissionSeen(assignmentId: string): Promise<void>
```

**Redaction rules that `getGameSnapshot` MUST enforce** (this is the whole game, get it right):

1. Identify the caller via `getSessionAttendeeId()`. Return `null` if absent.
2. `myAssignment` = the caller's own assignment in the current round, full payload.
3. `publicAssignments` = assignments in the current round with `visibility = 'public'` only.
4. `awaitingMyVerdict` = assignments where `arbiter_id === me` AND `status = 'claimed'`. **Strip `actor_id` and any hunter-identifying field from these before returning** - the target must not learn who was hunting them until it resolves. Return a redacted shape: `{ id, payload: { action, location }, claim_note, claimed_at }`.
5. `feed` = `getEvents(gameId, 30)` (already public-only at the db layer).
6. `hasUnseen` = `myAssignment !== null && myAssignment.seen_at === null && myAssignment.status === 'active'`.
7. Admins get no extra data from this function. Admin extras live in Task 11.

> **Design note on rule 4:** for Assassin, revealing the action and location to the target is unavoidable (they have to confirm it happened). Revealing the hunter is not. Reveal the hunter only in the resolution event, once the mission is closed.

**Also add:** `markMissionSeen` sets `seen_at` (no-op if already set), logs no event, and `revalidatePath('/tasks')`.

**Verify:** `npm run build`.
**Commit:** `feat(games): snapshot read actions with redaction`.

### Task 10: Player write actions

**Objective:** Claim, confirm, deny, and the SKATE equivalents. All actor identity comes from the cookie.

**Files:** Modify `app/games/actions.ts`.

```ts
/** Assassin: "I got them." Moves active -> claimed, notifies the target. */
export async function claimAssignment(assignmentId: string, note?: string): Promise<void>

/** Arbiter verdict. approve=true -> succeeded, false -> disputed. */
export async function resolveClaim(assignmentId: string, approve: boolean): Promise<void>

/** SKATE phase 1: a player calls a set. Opens a round in 'setting' phase. */
export async function callSkateSet(gameId: string, challenge: string): Promise<void>

/** SKATE phase 1 -> 2: the setter reports whether they landed their own set. */
export async function reportSetterAttempt(roundId: string, landed: boolean): Promise<void>

/** SKATE phase 2: "I matched it" / "I ducked it" on your own assignment. */
export async function reportSkateAttempt(assignmentId: string, matched: boolean): Promise<void>
```

**Guard rails for each:**

- `claimAssignment`: caller must be `actor_id`; status must be `active`. Set `status='claimed'`, `claimed_at=now()`, `claim_note`. Log a `claimed` event with `is_public=false` (a public "someone claimed something" line would tip people off).
- `resolveClaim`: caller must be `arbiter_id` OR admin; status must be `claimed`.
  - approve -> `status='succeeded'`, bump the actor's `state.score` by 1, log a **public** `confirmed` event now naming the hunter, the action and the location. This is the fun bit: it is the reveal.
  - deny -> `status='disputed'`, log a private `denied` event, surface it in the admin queue for an override. Do **not** silently fail the mission; a denial is a dispute, not a verdict.

**SKATE is a two-phase round** (decision 7, classic rules - the setter must land it first):

- `callSkateSet`: caller must be a player in the game and not `is_out`; game must be `active`; **there must be no open round** (one set at a time). Create round N+1 with `payload = { setter_id: me, challenge, phase: 'setting', setter_landed: null }`. **Create no assignments yet.** Log a public `set_called` event: "Carl is going for 30 press-ups."
- `reportSetterAttempt`: caller must be `payload.setter_id` OR admin; round must be `open` with `phase === 'setting'`.
  - `landed = true` -> patch the round payload to `{ phase: 'chasing', setter_landed: true }`, then create one `public`, `active` assignment for each id returned by **`skateChasers(players, setterId)`** (live players minus the setter), each with `arbiter_id = setter_id`. **Use that helper - do not filter the player list inline**; it is the tested guarantee that the setter never gets an assignment and therefore can never be lettered by their own set. Log a public `round_opened` event: "Carl landed it. Everyone else: 30 press-ups or take a letter."
  - `landed = false` -> `closeRound(roundId)`, patch payload `{ setter_landed: false }`, **nobody collects a letter, including the setter**, log a public `set_missed` event: "Carl blew his own set. No letters." The next player is then free to call a set. **Do not call `addLetter` anywhere in this branch.**
- `reportSkateAttempt`: caller must be `actor_id`; status must be `active`; the round must be in `chasing` phase.
  - matched -> `status='succeeded'`, public `matched` event.
  - not matched -> `status='failed'`, `addLetter` on the player's `letters`, `setPlayerOut` if `isEliminated`, public `letter_given` event.
  - After every report, if **no `active` assignments remain in the round**, `closeRound(roundId)` automatically. Then if exactly one player survives, set game `status='ended'` and log `game_ended`.

Every action ends with `revalidatePath('/tasks')`.

**Pitfall:** `revalidatePath` alone will not refresh a client component holding stale props. The views in Phase 5 must call `router.refresh()` inside the `useTransition` callback, the same way a Next 14 client component normally does. Note this in the component tasks.

**Verify:** `npm run build`.
**Commit:** `feat(games): player claim and resolve actions`.

### Task 11: Admin actions

**Objective:** Everything Nick can do from his phone.

**Files:** Modify `app/games/actions.ts`.

```ts
export async function createGameAction(kind, title, attendeeIds, config): Promise<Game>
export async function startGame(gameId): Promise<void>            // draft -> active
export async function dealAssassinRound(gameId): Promise<void>    // the big red button
export async function endGame(gameId): Promise<void>
export async function adminOverrideAssignment(assignmentId, status): Promise<void>
export async function getAdminGameView(gameId): Promise<AdminGameView>
export async function addPrompt(kind, category, text): Promise<GamePrompt>
export async function togglePrompt(promptId, isActive): Promise<GamePrompt>
export async function removePrompt(promptId): Promise<void>
```

Add a shared guard at the top of the file:

```ts
async function requireAdmin(): Promise<Attendee> {
  const id = getSessionAttendeeId();
  const me = id ? await db.getAttendeeById(id) : null;
  if (!me?.is_admin) throw new Error('Admin only');
  return me;
}
```

`dealAssassinRound` is the centrepiece:

1. `requireAdmin()`.
2. Load the game, assert `kind === 'assassin'` and `status === 'active'`.
3. Load players (not `is_out`), assert >= 3, else throw a friendly "Need at least 3 players".
4. Load active prompts: actions and locations. Assert both non-empty.
5. Close the current round if one is open. **Void only assignments still at `status='active'`** (log `admin_override`). Leave `claimed` assignments untouched and open, so a slow target can still confirm them and the hunter keeps the point they earned (decision 9).
6. `buildAssassinRound(playerIds, actions, locations)`.
7. `createRound(gameId, n+1, {})`, then `createAssignments(...)` with `visibility: 'private'`, `status: 'active'`, `seen_at: null`.
8. Log a public `round_opened` event with **no payload details** - "Round 2 is live. Check your mission." That line is the in-app delivery.
9. `revalidatePath('/tasks')`.

`getAdminGameView` returns the unredacted picture: every assignment with actor and target names resolved, plus the dispute queue. Admin-only, guarded.

**Verify:** `npm run build`.
**Commit:** `feat(games): admin game management actions`.

---

## Phase 5: UI

All components live in `components/games/`. Match the existing card styling exactly.

### Task 12: `GamesPanel` - the flexible container

**Files:** Create `components/games/GamesPanel.tsx` (client component).

**Behaviour:**
- Props: `{ snapshots: GameSnapshot[]; me: PublicAttendee; allAttendees: PublicAttendee[] }`.
- Renders nothing (returns `null`) when there are no games and the user is not an admin. **The Tasks page must look unchanged for non-admins until Nick starts a game.**
- For each snapshot, looks up `getGameKind(snapshot.game.kind)` and renders its `PlayerView`, plus `AdminView` beneath it when `me.is_admin`.
- Unknown kind -> render a small "Unsupported game" card rather than crashing. Forward-compatibility matters when the DB can be edited by hand.
- Admins additionally see a `<NewGameCard />` (Task 16).

**Commit:** `feat(games): games panel container`.

### Task 13: `MissionBriefing` - the delivery moment

**Files:** Create `components/games/MissionBriefing.tsx`.

**Behaviour:**
- Full-screen overlay, shown when `snapshot.hasUnseen` is true, styled like `LoginModal.tsx` (read it first for the overlay pattern).
- Three-beat reveal so it feels like a briefing rather than a form: **TARGET** (name, large), **MISSION** (the action), **SETTING** (the location). Then a single "Got it, delete this message" button.
- Tapping it calls `markMissionSeen(assignmentId)` then `router.refresh()`.
- Copy warns: "Do not let them know it is you."
- Include a `Eye`/`EyeOff` toggle so a player can re-read their mission later without holding the phone face-down (see Task 14).

**Commit:** `feat(games): mission briefing overlay`.

### Task 14: Assassin views

**Files:** Create `components/games/AssassinView.tsx` exporting `AssassinPlayerView` and `AssassinAdminView`.

**`AssassinPlayerView`:**
- **Your mission** card, collapsed to a "Tap to reveal" blur by default so nobody reads it over your shoulder. Revealing shows target, action, location.
- Primary button: **"I got them"** -> `claimAssignment(id)`, optional one-line note ("he did it outside El Pimpi").
- While `status='claimed'`: "Waiting for confirmation..." with the button disabled.
- **Verdict prompt** when `awaitingMyVerdict.length > 0`: "Someone reckons they made you *do ten press-ups* *in a crowd*. Did that happen?" with Yes / No. **Do not show who claimed it.**
- **Scoreboard** from `snapshot.players`, sorted by score desc, the caller highlighted.
- **Feed** from `snapshot.feed`, public events only, newest first, e.g. "Dave got Carl to sing a chorus at a bar. +1 Dave."
- If `myAssignment === null` and the game is active: "No mission yet. Sit tight."

**`AssassinAdminView`:**
- Big **"Deal missions"** button (label from `newRoundLabel`), confirms before dealing when a round is already open ("This voids 4 live missions").
- Round N status: X active, Y claimed, Z confirmed, W disputed.
- **Dispute queue**: each disputed assignment with hunter name, target name, action, location, claim note, and Force success / Force fail buttons -> `adminOverrideAssignment`.
- Player list with scores, and End game.

**Pitfall:** every mutating handler wraps in `useTransition` AND calls `router.refresh()` after the action resolves, or the panel keeps showing stale server props.

**Commit:** `feat(games): assassin player and admin views`.

### Task 15: SKATE views and kind registration

**Files:**
- Create `components/games/SkateView.tsx` exporting `SkatePlayerView`, `SkateAdminView`.
- Create `components/games/index.ts` doing the two `registerGameKind(...)` calls.

**`SkatePlayerView`:**
- **Letter board**: each player as a row, their name, and the word rendered letter by letter with earned letters filled emerald and unearned ones as faint outlines. Eliminated players struck through. Winner gets a crown. Use `skateStandings()` for ordering.
- **Current set** card, which renders by round phase (classic SKATE, decision 7):
  - **No open round** -> "Set a challenge" input + button (`callSkateSet`), disabled when the caller is out. Include a "surprise me" pick from the `challenge` prompt pool.
  - **`phase === 'setting'`, caller IS the setter** -> "You called: 30 press-ups. Land it or the set is void." with **Landed it** / **Missed it** buttons -> `reportSetterAttempt`.
  - **`phase === 'setting'`, caller is NOT the setter** -> "Carl is going for 30 press-ups. Wait and see." No buttons; nobody is on the hook until the setter lands it.
  - **`phase === 'chasing'`, caller has an active assignment** -> "Carl landed 30 press-ups. Your turn." with **Did it** / **Ducked it** -> `reportSkateAttempt`.
  - **`phase === 'chasing'`, caller IS the setter** -> "Waiting on 3 others."
- The set-a-challenge control is disabled whenever any round is open, so only one set runs at a time.
- Feed shared with the engine.

**`SkateAdminView`:** override any assignment, remove or restore a letter (`adminOverrideAssignment` plus a `setPlayerLetters` admin action - add it in Task 11 if missing), close the round, end the game.

**`components/games/index.ts`:**

```ts
import { registerGameKind } from '@/lib/games/registry';
import { AssassinPlayerView, AssassinAdminView } from './AssassinView';
import { SkatePlayerView, SkateAdminView } from './SkateView';

registerGameKind({
  kind: 'assassin',
  label: 'Assassin',
  blurb: 'Secret missions. Get your target doing the deed without them twigging.',
  icon: 'Crosshair',
  newRoundLabel: 'Deal missions',
  PlayerView: AssassinPlayerView,
  AdminView: AssassinAdminView,
});

registerGameKind({
  kind: 'skate',
  label: 'SKATE',
  blurb: 'Someone sets a challenge. Duck it and you collect a letter.',
  icon: 'Dumbbell',
  newRoundLabel: 'Call a set',
  PlayerView: SkatePlayerView,
  AdminView: SkateAdminView,
});
```

`GamesPanel` imports `'./index'` for the side effect before using the registry.

**Commit:** `feat(games): skate views and kind registration`.

### Task 16: Admin game creation + prompt pool editor

**Files:**
- Create `components/games/NewGameCard.tsx`
- Create `components/games/PromptPoolEditor.tsx`

**`NewGameCard`:** kind picker driven by `listGameKinds()` (so a future game appears automatically), title input pre-filled ("Assassin - Day 2"), attendee multi-select defaulting to everyone, SKATE word input when kind is skate, Create button -> `createGameAction` then `startGame`.

**`PromptPoolEditor`:** admin-only, collapsed by default. Two columns for Assassin (Actions, Locations) plus a Challenges list for SKATE. Each row: text, an active toggle, a delete button. An "add" input per column. Wired to `addPrompt` / `togglePrompt` / `removePrompt`.

**Commit:** `feat(games): admin game creation and prompt editor`.

### Task 17: Wire into the Tasks page

**Files:**
- Modify `app/tasks/page.tsx`
- Modify `components/TasksView.tsx`

**`app/tasks/page.tsx`:**

```tsx
const [allAttendees, groupOverview, snapshots, me] = await Promise.all([
  getAttendeeList(),
  getGroupOverview(),
  getActiveGameSnapshots(),
  getCurrentUser(),
]);
```

Pass `snapshots` and `me` down to `TasksView`.

**`components/TasksView.tsx`:** restructure into two clearly separated sections so the page reads as "admin tasks, then games":

1. `Your checklist` (unchanged existing card).
2. `<GamesPanel />` (renders nothing when there is nothing to show).
3. `Admin dashboard` (unchanged existing card, still `user.is_admin` gated).

Do not otherwise touch the existing checklist or admin dashboard markup.

**Verify:** `npm run lint && npm run build`, then `npm run dev` and eyeball `/tasks` as a non-admin (no games) - it must look identical to before.
**Commit:** `feat(tasks): mount games panel on the tasks page`.

### Task 18: Unseen-mission badge on the nav

**Objective:** The "you have been delivered a mission" signal, without push.

**Files:**
- Modify `components/BottomNav.tsx`
- Modify `app/layout.tsx` (to supply the count)

**Behaviour:** a small emerald dot on the Tasks tab icon when the user has any unseen assignment or any pending verdict. Simplest correct wiring: a tiny server action `getPendingGameCount(): Promise<number>` called from the layout (already a server component) and passed to `BottomNav` as a prop.

**Pitfall:** the layout is cached. `revalidatePath('/')` is already called by the actions, and the service worker is network-first for navigations (`public/sw.js`), so the badge updates on the next app open. That is the agreed delivery model - do not add polling.

**Commit:** `feat(nav): unseen mission badge on tasks tab`.

---

## Phase 6: verification

### Task 19: Full verification pass

```bash
npm test          # expect: assassin 7 passed, skate 6 passed
npm run lint      # expect: no ESLint warnings or errors
npm run build     # expect: compiled successfully, /tasks listed
```

**Manual script, run against the mock backend (`npm run dev`, no Supabase keys):**

1. Log in as Nick (admin). Tasks tab shows checklist + admin dashboard + New game card.
2. Create an Assassin game with all 4 attendees. Press **Deal missions**.
3. Log out, log in as Carl. Tasks tab has a badge. Opening it fires the briefing overlay exactly once. Reload: no second overlay, but the mission is re-readable behind the blur.
4. As Carl, claim the mission with a note.
5. Log in as Carl's target. A verdict prompt appears and **does not name Carl**. Confirm it.
6. Back as Carl: score is 1, and the public feed names him. Target's verdict prompt is gone.
7. Repeat step 4-5 but deny. The item lands in Nick's dispute queue; force success from there.
8. Create a SKATE game. As Dave, call a set of "30 press-ups". Other players see "Dave is going for 30 press-ups" with **no buttons** - they are not on the hook yet.
9. As Dave, tap **Missed it**. Round closes, nobody collects a letter, feed says so. **Check the letter board: Dave's row is unchanged** - blowing your own set costs nothing. Confirm anyone can now call a fresh set.
10. As Dave, call another set and tap **Landed it**. Now every other player gets Did it / Ducked it, and **Dave gets no buttons at all** - he has no assignment for his own set. One player ducks it and collects an S. Board updates. Repeat until one survivor remains; the game auto-ends and shows a winner.
11. Over the whole SKATE run, confirm **no player ever gained a letter during a round they set**. This is the classic-SKATE invariant and the one most likely to be quietly broken.
12. Deal a second Assassin round while round 1 has one `active` and one `claimed` mission. Confirm the `active` one is voided and the `claimed` one survives and is still confirmable by its target.

**Then repeat steps 1-6 against a real Supabase project** after running the updated `schema.sql`. Confirm the permissive policies are in place and no read silently returns zero rows.

**Commit:** `test: verification pass for games engine`.

### Task 20: Update `IDEA.md`

Two or three lines describing the games section and how to add a third game kind (new `kind` value in the SQL check constraint, a generator in `lib/games/`, two views, one `registerGameKind` call). Future-you will want this.

**Commit:** `docs: describe games engine extension points`.

---

## Files this touches

**Create:**
- `vitest.config.ts`
- `lib/games/registry.ts`
- `lib/games/assassin.ts` + `lib/games/assassin.test.ts`
- `lib/games/skate.ts` + `lib/games/skate.test.ts`
- `lib/games/db.ts`
- `app/games/actions.ts`
- `components/games/GamesPanel.tsx`
- `components/games/MissionBriefing.tsx`
- `components/games/AssassinView.tsx`
- `components/games/SkateView.tsx`
- `components/games/NewGameCard.tsx`
- `components/games/PromptPoolEditor.tsx`
- `components/games/index.ts`

**Modify:**
- `schema.sql` (append tables, seed, policies)
- `lib/types.ts` (append engine types)
- `lib/mockData.ts` (mock stores)
- `lib/supabase.ts` (service-role client, pending Task 2)
- `app/tasks/page.tsx`
- `components/TasksView.tsx`
- `components/BottomNav.tsx`
- `app/layout.tsx`
- `package.json`
- `IDEA.md`

**Deliberately untouched:** `app/actions.ts` (games get their own actions file), money, flights, schedule.

---

## Risks and tradeoffs

| Risk | Mitigation |
|---|---|
| **Mission secrecy leaks via the API.** RLS is permissive on every table including the game tables (decision 6). | Accepted. Secrecy is enforced by server-action redaction, which stops the *app* leaking missions - the realistic failure mode. A player who opens devtools and hand-crafts a Supabase query can read raw rows, and if they are that determined they have already ruined their own weekend. |
| **A target denies a legitimate claim** to protect their own score. | Denial creates a *dispute*, not a failure. Nick adjudicates from the admin queue. |
| **The target learns a mission exists on them** the moment a claim is made. | Unavoidable given the confirmation model. The hunter's identity stays hidden until resolution, which preserves most of the tension. Accepted tradeoff. |
| **In-app-only delivery means someone never opens the app** and their mission dies. | The nav badge plus Nick shouting "check the app" is the mitigation. Web Push is designed for and deferred. |
| **A player claims a mission at 2am** and nobody confirms. | Admin can force-resolve anything. Consider a Phase 7 auto-void at round close. |
| **Small prompt pools cause repeats.** | `drawPrompts` degrades gracefully rather than throwing; the seed ships 12 actions and 10 locations for 4 to 12 players. |
| **The mock store resets on dev server restart**, losing a test game. | Expected, matches existing behaviour. Real testing happens on Supabase. |
| **JSONB payloads have no compile-time safety.** | The kind-specific payload interfaces in `lib/types.ts` plus narrow accessors in each game module. Add a runtime guard if a payload read ever throws. |

## Open questions

None outstanding - decisions 1-9 in the header settle everything previously flagged. If an implementer hits an unlisted ambiguity, prefer the choice that keeps the engine kind-agnostic.

## Deferred (Phase 7, not in this build)

- Web Push (VAPID keys, `pushsubscriptions` table, `push` handler in `public/sw.js`, a Netlify function to fan out). The schema already carries everything a push payload needs; only the transport is missing.
- Photo evidence on a claim (Supabase Storage bucket, `claim_photo_url` on `game_assignments`).
- A third game kind, to prove the abstraction. Candidates: Roulette (random forfeits on a timer), Bounty (public one-off challenges with points).
- End-of-weekend awards screen driven entirely by `game_events`.
