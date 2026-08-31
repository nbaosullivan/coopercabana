import { describe, it, expect, beforeEach } from 'vitest';
import * as db from './db';
import { mockDb, resetMock } from './mockData';
import { stripPin, PIN_UNSET } from './types';

describe('PIN login flow (mock store)', () => {
  beforeEach(() => {
    resetMock();
  });

  it('attendees seed with PIN_UNSET so first login uses group password', async () => {
    const nick = await db.getAttendeeById('11111111-1111-1111-1111-111111111111');
    expect(nick?.pin).toBe(PIN_UNSET);
    const pub = stripPin(nick!);
    expect(pub.has_pin).toBe(false);
    expect('pin' in pub).toBe(false);
  });

  it('updateAttendeePin sets the pin and stripPin reports has_pin', async () => {
    const updated = await db.updateAttendeePin('11111111-1111-1111-1111-111111111111', '4321');
    expect(updated.pin).toBe('4321');
    const pub = stripPin(updated);
    expect(pub.has_pin).toBe(true);
  });

  it('mock store persists the pin within a session', async () => {
    await db.updateAttendeePin('22222222-2222-2222-2222-222222222222', '9999');
    const again = await db.getAttendeeById('22222222-2222-2222-2222-222222222222');
    expect(again?.pin).toBe('9999');
    expect(mockDb.attendees.find((a) => a.id === '22222222-2222-2222-2222-222222222222')?.pin).toBe('9999');
  });
});
