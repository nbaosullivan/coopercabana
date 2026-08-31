import { describe, it, expect } from 'vitest';
import { getScheduleDayLocks, toggleScheduleDayLock } from './db';

describe('schedule day locks', () => {
  it('starts with every day locked', async () => {
    const locks = await getScheduleDayLocks();
    expect(locks.length).toBe(4);
    expect(locks.every((d) => d.is_locked)).toBe(true);
  });

  it('toggles a single day between locked and unlocked', async () => {
    const unlocked = await toggleScheduleDayLock(2, false);
    expect(unlocked).toMatchObject({ day_number: 2, is_locked: false });

    const locks = await getScheduleDayLocks();
    const day2 = locks.find((d) => d.day_number === 2)!;
    expect(day2.is_locked).toBe(false);
    expect(locks.filter((d) => d.day_number !== 2).every((d) => d.is_locked)).toBe(true);

    // And back again.
    await toggleScheduleDayLock(2, true);
    const relocked = (await getScheduleDayLocks()).find((d) => d.day_number === 2)!;
    expect(relocked.is_locked).toBe(true);
  });

  it('throws for an unknown day', async () => {
    await expect(toggleScheduleDayLock(99, false)).rejects.toThrow();
  });
});
