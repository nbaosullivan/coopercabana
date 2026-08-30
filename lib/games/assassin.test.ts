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
