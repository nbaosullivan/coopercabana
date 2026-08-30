# Build prompt: Games engine (Assassin + SKATE)

Paste the block below into a fresh Hermes session opened at `/Users/nick/Projects/stag-do-app`.

---

Implement the games feature described in `.hermes/plans/2026-08-30_143000-games-engine-assassin-skate.md`. Read that plan in full before writing any code - it contains the complete schema, the algorithms, every server action signature, and the exact UI behaviour. It is the specification; this prompt is only the working agreement.

## What you are building

A flexible "Games" system inside the existing Tasks tab of a Next.js 14 stag-do PWA, with two games running on one generic, kind-agnostic engine:

- **Assassin** - each player secretly draws a target, an action, and a location. Get your target doing that action in that place without them realising it was you. The hunter claims it, the target confirms it, and the confirmation is what publicly reveals who was hunting them.
- **SKATE** - classic rules. A player calls a challenge (e.g. 30 press-ups) and must land it themselves first. If they miss, the set is void. If they land it, everyone else must match it or collect a letter. Spell the word, you are out.

The whole point of the architecture is that these two are just data. Adding a third game later must mean: one new `kind` value in the SQL check constraint, one generator in `lib/games/`, two React views, one `registerGameKind()` call. Nothing in the engine changes. If you find yourself adding an `if (kind === 'assassin')` branch inside engine code, you have taken a wrong turn - push that logic into the game module.

## How to work

Follow the plan's task order (Tasks 1-20). It is sequenced so the risky logic is proven before any UI exists.

- **TDD the two algorithms.** Tasks 5 and 6 give you complete test files. Write the test, run it, watch it fail, then implement. Do not write the implementation first and back-fill tests. `buildAssassinRound` in particular has a non-obvious correctness property (single random cycle, not a naive shuffle) and the tests are what prove it.
- **Commit after every task**, using the commit message given in the plan.
- **Verify before claiming done**: `npm test`, `npm run lint`, `npm run build` must all pass. Then run the manual script in Task 19 against the mock backend with `npm run dev`. Report what actually happened, including anything that did not work.
- Use `todo` to track the 20 tasks.

## Codebase conventions to respect

- `lib/db.ts` is the only file that knows about Supabase vs the in-memory mock; every function branches on `isSupabaseConfigured && supabase` and falls through to `mockDb`. Your `lib/games/db.ts` must follow that pattern exactly, and **every new table needs a mock array in `lib/mockData.ts`** or local dev breaks.
- Server actions live in `'use server'` files and call `revalidatePath` after every mutation. Client components must also call `router.refresh()` after an action resolves, or they keep rendering stale props.
- Styling: match the existing cards exactly - `rounded-2xl border border-zinc-800 bg-zinc-900 p-5`, headings `text-sm font-semibold text-zinc-200`, `emerald-500` affirmative, `red-400` negative, `useTransition` for pending state, lucide-react icons. Read `components/TasksView.tsx` and `components/LoginModal.tsx` first and copy their idiom.
- Do not touch money, flights, or schedule. Do not refactor anything the plan does not ask you to.

## The rules that matter most

These are the ones where a plausible-looking implementation is still wrong:

1. **Identity comes from the cookie, never the client.** Existing actions accept an `attendeeId` argument - that is tolerable for t-shirt sizes and unacceptable here. Every new action calls `getSessionAttendeeId()` itself and derives the actor from that. No action takes an `actorId` parameter.
2. **`getGameSnapshot` redaction is the feature.** When a target is shown a pending claim against them, they see the action and the location but **never the hunter's identity**. The hunter is revealed only in the public event logged on resolution. Get this wrong and the game is pointless.
3. **A denial is a dispute, not a verdict.** If a target says "no that didn't happen", the assignment goes to `disputed` and lands in the admin queue - it does not fail. Otherwise players just deny everything to protect their score.
4. **SKATE rounds are two-phase.** `setting` (only the setter can act) then `chasing` (everyone else can). Nobody is on the hook until the setter lands their own challenge. A missed set voids the round and gives out **no letters to anyone, the setter included** - blowing your own set costs you the turn and nothing more. The setter is never issued an assignment for their own set, so there must be no code path that can letter them for it; route assignment creation through the tested `skateChasers()` helper rather than filtering the player list inline.
5. **Dealing a new Assassin round voids only `active` assignments.** Anything already `claimed` stays open so a slow target can still confirm it and the hunter keeps the point they earned. Never delete work a player actually did.

## Deliberately out of scope

Web Push (in-app delivery only - the nav badge plus the briefing overlay), photo evidence on claims, and any third game kind. The schema is designed to accommodate all three later; do not build them now.

## If something is ambiguous

The plan's decisions 1-9 settle everything previously raised. For anything genuinely new, prefer the option that keeps the engine kind-agnostic, and flag the call in your summary rather than asking - unless it would change the data model, in which case ask first.

---

Copy from the horizontal rule above down to here.
