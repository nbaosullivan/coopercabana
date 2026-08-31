import { describe, it, expect } from 'vitest';
import { boardingPassCandidates } from './boardingPass';

const UUID = '11111111-1111-1111-1111-111111111111';

describe('boardingPassCandidates', () => {
  it('tries leg-specific files before the generic single pass', () => {
    const out = boardingPassCandidates(UUID, 'outbound');
    expect(out[0]).toBe(`/boarding/${UUID}-outbound.png`);
    expect(out).toContain(`/boarding/${UUID}.png`);
    expect(out.indexOf(`/boarding/${UUID}-outbound.png`)).toBeLessThan(
      out.indexOf(`/boarding/${UUID}.png`)
    );
  });

  it('tries each extension', () => {
    const out = boardingPassCandidates(UUID, 'outbound');
    expect(out).toEqual([
      `/boarding/${UUID}-outbound.png`,
      `/boarding/${UUID}-outbound.jpg`,
      `/boarding/${UUID}-outbound.jpeg`,
      `/boarding/${UUID}-outbound.webp`,
      `/boarding/${UUID}.png`,
      `/boarding/${UUID}.jpg`,
      `/boarding/${UUID}.jpeg`,
      `/boarding/${UUID}.webp`,
    ]);
  });

  it('return slot does not fall back to the generic single pass (avoids duplication)', () => {
    const ret = boardingPassCandidates(UUID, 'return');
    expect(ret).toEqual([
      `/boarding/${UUID}-return.png`,
      `/boarding/${UUID}-return.jpg`,
      `/boarding/${UUID}-return.jpeg`,
      `/boarding/${UUID}-return.webp`,
    ]);
  });
});
