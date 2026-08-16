import { supabase, isSupabaseConfigured } from './supabase';
import { mockDb } from './mockData';
import {
  Attendee,
  ScheduleItem,
  Expense,
  ExpenseAllocation,
  FlightData,
  TshirtSize,
} from './types';

// ---------------------------------------------------------------------------
// Single data-access layer. Every function transparently reads/writes either
// Supabase Postgres (when configured) or the in-memory mock store. Nothing
// outside this file needs to know which backend is active.
// ---------------------------------------------------------------------------

// --- Attendees ---------------------------------------------------------

export async function getAttendees(): Promise<Attendee[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('attendees').select('*').order('name');
    if (error) throw error;
    return data as Attendee[];
  }
  return [...mockDb.attendees].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAttendeeById(id: string): Promise<Attendee | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('attendees').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as Attendee) ?? null;
  }
  return mockDb.attendees.find((a) => a.id === id) ?? null;
}

export async function updateAttendeeFlights(attendeeId: string, data: FlightData): Promise<Attendee> {
  const patch = {
    outbound_flight_details: data.outbound_flight_details,
    outbound_arrival_time: data.outbound_arrival_time,
    return_flight_details: data.return_flight_details,
    return_departure_time: data.return_departure_time,
    flights_booked: true,
  };

  if (isSupabaseConfigured && supabase) {
    const { data: updated, error } = await supabase
      .from('attendees')
      .update(patch)
      .eq('id', attendeeId)
      .select()
      .single();
    if (error) throw error;
    return updated as Attendee;
  }

  const attendee = mockDb.attendees.find((a) => a.id === attendeeId);
  if (!attendee) throw new Error('Attendee not found');
  Object.assign(attendee, patch);
  return attendee;
}

export async function setFlightsBooked(attendeeId: string, booked: boolean): Promise<Attendee> {
  const patch = { flights_booked: booked };
  if (isSupabaseConfigured && supabase) {
    const { data: updated, error } = await supabase
      .from('attendees')
      .update(patch)
      .eq('id', attendeeId)
      .select()
      .single();
    if (error) throw error;
    return updated as Attendee;
  }
  const attendee = mockDb.attendees.find((a) => a.id === attendeeId);
  if (!attendee) throw new Error('Attendee not found');
  Object.assign(attendee, patch);
  return attendee;
}

export async function updateAttendeeTshirt(attendeeId: string, size: TshirtSize): Promise<Attendee> {
  if (isSupabaseConfigured && supabase) {
    const { data: updated, error } = await supabase
      .from('attendees')
      .update({ tshirt_size: size })
      .eq('id', attendeeId)
      .select()
      .single();
    if (error) throw error;
    return updated as Attendee;
  }
  const attendee = mockDb.attendees.find((a) => a.id === attendeeId);
  if (!attendee) throw new Error('Attendee not found');
  attendee.tshirt_size = size;
  return attendee;
}

// --- Schedule ------------------------------------------------------------

export async function getScheduleItems(): Promise<ScheduleItem[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('schedule_items')
      .select('*')
      .order('day_number')
      .order('start_time');
    if (error) throw error;
    return data as ScheduleItem[];
  }
  return [...mockDb.scheduleItems].sort((a, b) =>
    a.day_number !== b.day_number
      ? a.day_number - b.day_number
      : a.start_time.localeCompare(b.start_time)
  );
}

// --- Expenses --------------------------------------------------------------

export async function getExpenses(): Promise<Expense[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('expenses').select('*').order('title');
    if (error) throw error;
    return data as Expense[];
  }
  return [...mockDb.expenses];
}

export async function getExpenseAllocations(): Promise<ExpenseAllocation[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('expense_allocations').select('*');
    if (error) throw error;
    return data as ExpenseAllocation[];
  }
  return [...mockDb.expenseAllocations];
}

// --- Settings --------------------------------------------------------------

export async function getSetting(key: string): Promise<string | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();
      if (error) throw error;
      return (data as { value: string } | null)?.value ?? null;
    } catch {
      // Settings table may not exist yet (SQL not run in Supabase yet) —
      // degrade gracefully and let the caller use its default.
      return null;
    }
  }
  return mockDb.settings[key] ?? null;
}

export async function getAllocationsForAttendee(attendeeId: string): Promise<ExpenseAllocation[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('expense_allocations')
      .select('*')
      .eq('attendee_id', attendeeId);
    if (error) throw error;
    return data as ExpenseAllocation[];
  }
  return mockDb.expenseAllocations.filter((a) => a.attendee_id === attendeeId);
}

export async function toggleAllocationPaid(allocationId: string, isPaid: boolean): Promise<ExpenseAllocation> {
  const patch = {
    is_paid: isPaid,
  };

  if (isSupabaseConfigured && supabase) {
    // Also sync amount_paid to the full owed amount when marking paid, and
    // to 0 when marking unpaid, mirroring the mock behaviour below.
    const { data: existing, error: fetchErr } = await supabase
      .from('expense_allocations')
      .select('*')
      .eq('id', allocationId)
      .single();
    if (fetchErr) throw fetchErr;
    const amount_paid = isPaid ? (existing as ExpenseAllocation).amount_owed : 0;

    const { data: updated, error } = await supabase
      .from('expense_allocations')
      .update({ ...patch, amount_paid })
      .eq('id', allocationId)
      .select()
      .single();
    if (error) throw error;
    return updated as ExpenseAllocation;
  }

  const allocation = mockDb.expenseAllocations.find((a) => a.id === allocationId);
  if (!allocation) throw new Error('Allocation not found');
  allocation.is_paid = isPaid;
  allocation.amount_paid = isPaid ? allocation.amount_owed : 0;
  return allocation;
}
