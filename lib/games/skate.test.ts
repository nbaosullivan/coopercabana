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
