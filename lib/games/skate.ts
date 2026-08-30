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
