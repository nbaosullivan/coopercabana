'use server';

import { revalidatePath } from 'next/cache';
import * as db from '@/lib/db';
import { setSessionCookie, clearSessionCookie, getSessionAttendeeId } from '@/lib/session';
import {
  stripPin,
  PIN_UNSET,
  FlightData,
  TshirtSize,
  LoginResult,
  PublicAttendee,
  FinancesSummary,
  GroupOverviewRow,
  ScheduleItem,
  ScheduleDay,
  LandingPageKey,
  LANDING_PAGES,
  DEFAULT_LANDING_PAGE,
} from '@/lib/types';

// --- Auth --------------------------------------------------------------

// Shared app password — the one-time fallback for attendees who haven't
// set a personal PIN yet. They log in with it once, set their own PIN,
// and from then on use that PIN instead. Override via APP_PASSWORD env var
// to change it without a code edit.
const APP_PASSWORD = process.env.APP_PASSWORD ?? 'coops';

/** A valid PIN is exactly 4 digits. */
const PIN_PATTERN = /^\d{4}$/;

export async function getAttendeeList(): Promise<PublicAttendee[]> {
  const attendees = await db.getAttendees();
  return attendees.map(stripPin);
}

export async function loginUser(attendeeId: string, secret: string): Promise<LoginResult> {
  if (!attendeeId) {
    return { success: false, error: 'Pick your name first.' };
  }
  const attendee = await db.getAttendeeById(attendeeId);
  if (!attendee) {
    return { success: false, error: 'Attendee not found.' };
  }

  // No personal PIN yet — the group password gets them in once, then they
  // must set their own PIN (see setPin below). No revalidatePath here:
  // the client swaps in the logged-in tree and refreshes the router
  // afterwards (see LoginModal), which avoids racing that client update.
  if (attendee.pin === PIN_UNSET) {
    if (secret !== APP_PASSWORD) {
      return { success: false, error: 'Wrong group password. Try again.' };
    }
    setSessionCookie(attendee.id);
    return { success: true, attendee: stripPin(attendee), needsPinSetup: true };
  }

  if (secret !== attendee.pin) {
    return { success: false, error: 'Wrong PIN. Try again.' };
  }
  setSessionCookie(attendee.id);
  return { success: true, attendee: stripPin(attendee) };
}

/**
 * Set (or change) the signed-in attendee's personal PIN. Requires a live
 * session for that attendee, so it only works right after logging in —
 * you can't set someone else's PIN.
 */
export async function setPin(attendeeId: string, pin: string): Promise<LoginResult> {
  if (!PIN_PATTERN.test(pin)) {
    return { success: false, error: 'PIN must be 4 digits.' };
  }
  const sessionId = getSessionAttendeeId();
  if (!sessionId || sessionId !== attendeeId) {
    return { success: false, error: 'Sign in first, then set your PIN.' };
  }
  const updated = await db.updateAttendeePin(attendeeId, pin);
  return { success: true, attendee: stripPin(updated) };
}

export async function logoutUser(): Promise<void> {
  clearSessionCookie();
  revalidatePath('/');
}

export async function getCurrentUser(): Promise<PublicAttendee | null> {
  const id = getSessionAttendeeId();
  if (!id) return null;
  const attendee = await db.getAttendeeById(id);
  return attendee ? stripPin(attendee) : null;
}

// --- Settings ------------------------------------------------------------

export async function getDefaultLandingPage(): Promise<LandingPageKey> {
  const value = await db.getSetting('default_landing_page');
  return (LANDING_PAGES as readonly string[]).includes(value ?? '')
    ? (value as LandingPageKey)
    : DEFAULT_LANDING_PAGE;
}

/**
 * The attendee id of "the stag" — the one person kept off the Money tab so
 * the group can sort out costs without them seeing it. Configured via the
 * `stag_attendee_id` settings row; returns null when unset (nobody hidden).
 */
export async function getStagAttendeeId(): Promise<string | null> {
  const value = await db.getSetting('stag_attendee_id');
  return value && value.trim() !== '' ? value : null;
}

/**
 * When true, the Tasks tab's personal checklist (T-shirt size, flights
 * toggle) is hidden and the tab is relabelled "Games" everywhere (nav +
 * page title), since games are all that's left there. Configured via the
 * `hide_checklist` settings row.
 */
export async function getHideChecklist(): Promise<boolean> {
  const value = await db.getSetting('hide_checklist');
  return value === 'true';
}

// --- Flights -------------------------------------------------------------

export async function updateFlightDetails(attendeeId: string, data: FlightData): Promise<PublicAttendee> {
  const updated = await db.updateAttendeeFlights(attendeeId, data);
  revalidatePath('/flights');
  revalidatePath('/');
  return stripPin(updated);
}

export async function setFlightsBookedStatus(attendeeId: string, booked: boolean): Promise<PublicAttendee> {
  const updated = await db.setFlightsBooked(attendeeId, booked);
  revalidatePath('/flights');
  revalidatePath('/');
  return stripPin(updated);
}

export async function getFlightMatrix(): Promise<PublicAttendee[]> {
  const attendees = await db.getAttendees();
  return attendees
    .map(stripPin)
    .filter((a) => a.flights_booked && a.outbound_arrival_time)
    .sort((a, b) => (a.outbound_arrival_time! < b.outbound_arrival_time! ? -1 : 1));
}

// --- Tasks / T-Shirts ------------------------------------------------------

export async function updateTshirtSize(attendeeId: string, size: TshirtSize): Promise<PublicAttendee> {
  const updated = await db.updateAttendeeTshirt(attendeeId, size);
  revalidatePath('/tasks');
  revalidatePath('/');
  return stripPin(updated);
}

// --- Money -----------------------------------------------------------------

export async function togglePaymentStatus(allocationId: string, isPaid: boolean): Promise<void> {
  await db.toggleAllocationPaid(allocationId, isPaid);
  revalidatePath('/money');
  revalidatePath('/');
}

export async function getFinancesForUser(attendeeId: string): Promise<FinancesSummary> {
  const [allocations, expenses] = await Promise.all([
    db.getAllocationsForAttendee(attendeeId),
    db.getExpenses(),
  ]);
  const expenseById = new Map(expenses.map((e) => [e.id, e]));

  const enriched = allocations
    .map((a) => ({ ...a, expense: expenseById.get(a.expense_id)! }))
    .filter((a) => a.expense)
    .sort((a, b) => a.expense.title.localeCompare(b.expense.title));

  const totalOwed = enriched.reduce((sum, a) => sum + a.amount_owed, 0);
  const totalPaid = enriched.reduce((sum, a) => sum + a.amount_paid, 0);

  return {
    totalOwed,
    totalPaid,
    totalOutstanding: Math.max(0, totalOwed - totalPaid),
    allocations: enriched,
  };
}

export interface AdminAllocationRow {
  id: string;
  attendeeName: string;
  attendeeId: string;
  expenseTitle: string;
  amount_owed: number;
  is_paid: boolean;
}

export async function getAllAllocationsForAdmin(): Promise<AdminAllocationRow[]> {
  const [attendees, expenses, allocations] = await Promise.all([
    db.getAttendees(),
    db.getExpenses(),
    db.getExpenseAllocations(),
  ]);
  const attendeeById = new Map(attendees.map((a) => [a.id, a]));
  const expenseById = new Map(expenses.map((e) => [e.id, e]));

  return allocations
    .map((a) => ({
      id: a.id,
      attendeeName: attendeeById.get(a.attendee_id)?.name ?? 'Unknown',
      attendeeId: a.attendee_id,
      expenseTitle: expenseById.get(a.expense_id)?.title ?? 'Unknown',
      amount_owed: a.amount_owed,
      is_paid: a.is_paid,
    }))
    .sort((a, b) => a.expenseTitle.localeCompare(b.expenseTitle) || a.attendeeName.localeCompare(b.attendeeName));
}

export async function getGroupOverview(): Promise<GroupOverviewRow[]> {
  const [attendees, allocations] = await Promise.all([
    db.getAttendees(),
    db.getExpenseAllocations(),
  ]);

  return attendees.map((attendee) => {
    const mine = allocations.filter((a) => a.attendee_id === attendee.id);
    const totalOwed = mine.reduce((sum, a) => sum + a.amount_owed, 0);
    const totalPaid = mine.reduce((sum, a) => sum + a.amount_paid, 0);
    return {
      attendee: stripPin(attendee),
      totalOwed,
      totalPaid,
      totalOutstanding: Math.max(0, totalOwed - totalPaid),
    };
  });
}

// --- Schedule ----------------------------------------------------------

export async function getItinerary(): Promise<Record<number, ScheduleItem[]>> {
  const items = await db.getScheduleItems();
  const grouped: Record<number, ScheduleItem[]> = {};
  for (const item of items) {
    if (!grouped[item.day_number]) grouped[item.day_number] = [];
    grouped[item.day_number].push(item);
  }
  return grouped;
}

/** Which itinerary days are unlocked for the group (default: none). */
export async function getDayLocks(): Promise<ScheduleDay[]> {
  return db.getScheduleDayLocks();
}

/**
 * Admin-only. Unlock (isLocked=false) or re-lock a schedule day so its
 * contents stay hidden from the group until the organiser reveals them.
 */
export async function toggleDayLock(day: number, isLocked: boolean): Promise<void> {
  const me = await getCurrentUser();
  if (!me?.is_admin) throw new Error('Admin only');
  await db.toggleScheduleDayLock(day, isLocked);
  revalidatePath('/schedule');
  revalidatePath('/');
}
