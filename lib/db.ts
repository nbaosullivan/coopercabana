import { supabase, isSupabaseConfigured } from './supabase';
import { mockDb } from './mockData';
import {
  Attendee,
  ScheduleItem,
  ScheduleDay,
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

export async function updateAttendeePin(attendeeId: string, pin: string): Promise<Attendee> {
  if (isSupabaseConfigured && supabase) {
    const { data: updated, error } = await supabase
      .from('attendees')
      .update({ pin })
      .eq('id', attendeeId)
      .select()
      .single();
    if (error) throw error;
    return updated as Attendee;
  }
  const attendee = mockDb.attendees.find((a) => a.id === attendeeId);
  if (!attendee) throw new Error('Attendee not found');
  attendee.pin = pin;
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

// --- Schedule day locks -----------------------------------------------------

export async function getScheduleDayLocks(): Promise<ScheduleDay[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('schedule_days')
        .select('*')
        .order('day_number');
      if (error) throw error;
      return data as ScheduleDay[];
    } catch {
      // schedule_days may not exist yet (schema.sql not applied in Supabase).
      // Degrade to all-locked — nothing leaks, and the admin unlock just
      // won't work until the table is created.
      return [];
    }
  }
  return [...mockDb.scheduleDays]
    .sort((a, b) => a.day_number - b.day_number)
    .map((d) => ({ ...d }));
}

export async function toggleScheduleDayLock(day: number, isLocked: boolean): Promise<ScheduleDay> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('schedule_days')
      .update({ is_locked: isLocked, updated_at: new Date().toISOString() })
      .eq('day_number', day)
      .select()
      .single();
    if (error) {
      if (error.code === 'PGRST205') {
        // schedule_days doesn't exist in this Supabase project yet — the
        // schema.sql update hasn't been run there. Surface a clear,
        // actionable message instead of a raw Postgrest error.
        throw new Error(
          "The schedule_days table doesn't exist yet — run the updated schema.sql in the Supabase SQL editor to enable day locking."
        );
      }
      throw error;
    }
    return data as ScheduleDay;
  }

  const row = mockDb.scheduleDays.find((d) => d.day_number === day);
  if (!row) throw new Error(`No lock state for day ${day}`);
  row.is_locked = isLocked;
  return { ...row };
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
