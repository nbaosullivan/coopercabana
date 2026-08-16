'use server';

import { revalidatePath } from 'next/cache';
import * as db from '@/lib/db';
import { setSessionCookie, clearSessionCookie, getSessionAttendeeId } from '@/lib/session';
import {
  stripPin,
  FlightData,
  TshirtSize,
  LoginResult,
  PublicAttendee,
  FinancesSummary,
  GroupOverviewRow,
  ScheduleItem,
} from '@/lib/types';

// --- Auth --------------------------------------------------------------

// Shared app password — a lightweight gate for the group (everyone uses
// "coops"). Override via APP_PASSWORD env var to change it without a code edit.
const APP_PASSWORD = process.env.APP_PASSWORD ?? 'coops';

export async function getAttendeeList(): Promise<PublicAttendee[]> {
  const attendees = await db.getAttendees();
  return attendees.map(stripPin);
}

export async function loginUser(attendeeId: string, password: string): Promise<LoginResult> {
  if (!attendeeId) {
    return { success: false, error: 'Pick your name first.' };
  }
  if (password !== APP_PASSWORD) {
    return { success: false, error: 'Wrong password. Try again.' };
  }
  const attendee = await db.getAttendeeById(attendeeId);
  if (!attendee) {
    return { success: false, error: 'Attendee not found.' };
  }
  setSessionCookie(attendee.id);
  revalidatePath('/');
  return { success: true, attendee: stripPin(attendee) };
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
