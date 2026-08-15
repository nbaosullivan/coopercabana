export type TshirtSize = 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL';

export interface Attendee {
  id: string;
  name: string;
  pin: string;
  is_admin: boolean;
  tshirt_size: TshirtSize | null;
  flights_booked: boolean;
  outbound_flight_details: string | null;
  outbound_arrival_time: string | null;
  return_flight_details: string | null;
  return_departure_time: string | null;
}

/** Attendee shape safe to send to the client — never includes the PIN. */
export type PublicAttendee = Omit<Attendee, 'pin'>;

export interface ScheduleItem {
  id: string;
  day_number: number;
  start_time: string;
  end_time: string | null;
  title: string;
  description: string | null;
  location_name: string | null;
  address: string | null;
  google_maps_url: string | null;
  uber_url: string | null;
}

export interface Expense {
  id: string;
  title: string;
  total_cost: number;
  notes: string | null;
}

export interface ExpenseAllocation {
  id: string;
  expense_id: string;
  attendee_id: string;
  amount_owed: number;
  amount_paid: number;
  is_paid: boolean;
}

export interface FlightData {
  outbound_flight_details: string;
  outbound_arrival_time: string | null;
  return_flight_details: string;
  return_departure_time: string | null;
}

export interface ExpenseAllocationWithExpense extends ExpenseAllocation {
  expense: Expense;
}

export interface FinancesSummary {
  totalOwed: number;
  totalPaid: number;
  totalOutstanding: number;
  allocations: ExpenseAllocationWithExpense[];
}

export interface GroupOverviewRow {
  attendee: PublicAttendee;
  totalOwed: number;
  totalPaid: number;
  totalOutstanding: number;
}

export interface LoginResult {
  success: boolean;
  error?: string;
  attendee?: PublicAttendee;
}

export function stripPin(a: Attendee): PublicAttendee {
  const { pin, ...rest } = a;
  return rest;
}
