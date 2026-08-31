import {
  Attendee,
  ScheduleItem,
  ScheduleDay,
  Expense,
  ExpenseAllocation,
  Game,
  GamePlayer,
  GameRound,
  GameAssignment,
  GameEvent,
  GamePrompt,
} from './types';

// ---------------------------------------------------------------------------
// In-memory mock dataset. Used automatically whenever Supabase env vars are
// missing (see lib/supabase.ts), so the app runs instantly with `npm run dev`
// and zero setup. Mirrors schema.sql exactly, including seed data.
//
// NOTE: state lives for the lifetime of the Node process (i.e. your local
// dev server). It resets on restart. This is expected for a mock fallback —
// wire up real Supabase credentials for persistence.
// ---------------------------------------------------------------------------

// Use a module-level global so hot-reload in dev doesn't wipe state on every
// file save.
const globalForMock = globalThis as unknown as {
  __stagMock?: {
    attendees: Attendee[];
    scheduleItems: ScheduleItem[];
    scheduleDays: ScheduleDay[];
    expenses: Expense[];
    expenseAllocations: ExpenseAllocation[];
    settings: Record<string, string>;
    games: Game[];
    gamePlayers: GamePlayer[];
    gameRounds: GameRound[];
    gameAssignments: GameAssignment[];
    gameEvents: GameEvent[];
    gamePrompts: GamePrompt[];
  };
};

let mockSeq = 0;
export const mockId = (prefix: string) => `${prefix}-${++mockSeq}`;

function seed() {
  const attendees: Attendee[] = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Nick (Organiser)',
      pin: '1234',
      is_admin: true,
      tshirt_size: 'L',
      flights_booked: true,
      outbound_flight_details: 'EZY8201 (GVA -> AGP)',
      outbound_arrival_time: '2026-09-01T12:30:00Z',
      return_flight_details: 'EZY8202 (AGP -> GVA)',
      return_departure_time: '2026-09-04T16:00:00Z',
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Cooper (The Stag)',
      pin: '1234',
      is_admin: false,
      tshirt_size: 'XL',
      flights_booked: true,
      outbound_flight_details: 'BA0452 (LHR -> AGP)',
      outbound_arrival_time: '2026-09-01T10:00:00Z',
      return_flight_details: 'BA0453 (AGP -> LHR)',
      return_departure_time: '2026-09-04T18:15:00Z',
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Carl',
      pin: '1234',
      is_admin: false,
      tshirt_size: 'M',
      flights_booked: false,
      outbound_flight_details: null,
      outbound_arrival_time: null,
      return_flight_details: null,
      return_departure_time: null,
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      name: 'Dave',
      pin: '1234',
      is_admin: false,
      tshirt_size: 'L',
      flights_booked: true,
      outbound_flight_details: 'FR2104 (STN -> AGP)',
      outbound_arrival_time: '2026-09-01T13:10:00Z',
      return_flight_details: 'FR2105 (AGP -> STN)',
      return_departure_time: '2026-09-04T14:30:00Z',
    },
  ];

  const scheduleItems: ScheduleItem[] = [
    {
      id: 's1000000-0000-0000-0000-000000000001',
      day_number: 1,
      start_time: '15:00',
      end_time: '19:00',
      title: 'Villa Check-In & Welcome Drinks',
      description: 'Grab rooms, stock fridge, get pool ready.',
      location_name: 'Villa Coopercabana',
      address: 'Calle Benalmádena 12, Málaga',
      google_maps_url: 'https://maps.google.com/?q=Calle+Benalmadena+12+Malaga',
      uber_url:
        'https://m.uber.com/ul/?action=setPickup&dropoff[formatted_address]=Calle%20Benalm%C3%A1dena%2012%2C%20M%C3%A1laga',
    },
    {
      id: 's1000000-0000-0000-0000-000000000002',
      day_number: 1,
      start_time: '20:00',
      end_time: '23:30',
      title: 'Tapas & Old Town Drinks',
      description: 'Casual dinner in downtown historic center.',
      location_name: 'El Pimpi',
      address: 'Calle Granada 62, Málaga',
      google_maps_url: 'https://maps.google.com/?q=El+Pimpi+Malaga',
      uber_url:
        'https://m.uber.com/ul/?action=setPickup&dropoff[formatted_address]=Calle%20Granada%2062%2C%20M%C3%A1laga',
    },
    {
      id: 's1000000-0000-0000-0000-000000000003',
      day_number: 2,
      start_time: '11:00',
      end_time: '14:00',
      title: '270cc Outdoor Go-Karting Championship',
      description: 'Grand Prix format: Qualifying + 20-lap race. Trophy for 1st.',
      location_name: 'Karting Experience',
      address: 'Carretera Coín Km 5, Málaga',
      google_maps_url: 'https://maps.google.com/?q=Karting+Experience+Malaga',
      uber_url:
        'https://m.uber.com/ul/?action=setPickup&dropoff[formatted_address]=Carretera%20Co%C3%ADn%20Km%205%2C%20M%C3%A1laga',
    },
    {
      id: 's1000000-0000-0000-0000-000000000004',
      day_number: 2,
      start_time: '17:00',
      end_time: '21:00',
      title: 'Sunset Catamaran Boat Party',
      description: '4-hour cruise with open bar and DJ set.',
      location_name: 'Puerto Marina',
      address: 'Paseo Marítimo, Benalmádena',
      google_maps_url: 'https://maps.google.com/?q=Puerto+Marina+Benalmadena',
      uber_url:
        'https://m.uber.com/ul/?action=setPickup&dropoff[formatted_address]=Puerto%20Marina%20Benalm%C3%A1dena',
    },
  ];

  const expenses: Expense[] = [
    {
      id: 'e1111111-1111-1111-1111-111111111111',
      title: 'Luxury Villa (4 Nights)',
      total_cost: 1200.0,
      notes: 'Revolut / Bank Transfer to Nick',
    },
    {
      id: 'e2222222-2222-2222-2222-222222222222',
      title: 'Outdoor Go-Karting Grand Prix',
      total_cost: 320.0,
      notes: 'Includes helmet rental & track timing',
    },
    {
      id: 'e3333333-3333-3333-3333-333333333333',
      title: 'Private Catamaran Boat Charter',
      total_cost: 600.0,
      notes: 'Paid in advance',
    },
  ];

  const expenseAllocations: ExpenseAllocation[] = [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      expense_id: 'e1111111-1111-1111-1111-111111111111',
      attendee_id: '11111111-1111-1111-1111-111111111111',
      amount_owed: 300.0,
      amount_paid: 300.0,
      is_paid: true,
    },
    {
      id: 'a0000000-0000-0000-0000-000000000002',
      expense_id: 'e1111111-1111-1111-1111-111111111111',
      attendee_id: '22222222-2222-2222-2222-222222222222',
      amount_owed: 300.0,
      amount_paid: 300.0,
      is_paid: true,
    },
    {
      id: 'a0000000-0000-0000-0000-000000000003',
      expense_id: 'e1111111-1111-1111-1111-111111111111',
      attendee_id: '33333333-3333-3333-3333-333333333333',
      amount_owed: 300.0,
      amount_paid: 0.0,
      is_paid: false,
    },
    {
      id: 'a0000000-0000-0000-0000-000000000004',
      expense_id: 'e1111111-1111-1111-1111-111111111111',
      attendee_id: '44444444-4444-4444-4444-444444444444',
      amount_owed: 300.0,
      amount_paid: 0.0,
      is_paid: false,
    },
    {
      id: 'a0000000-0000-0000-0000-000000000005',
      expense_id: 'e2222222-2222-2222-2222-222222222222',
      attendee_id: '33333333-3333-3333-3333-333333333333',
      amount_owed: 80.0,
      amount_paid: 0.0,
      is_paid: false,
    },
    {
      id: 'a0000000-0000-0000-0000-000000000006',
      expense_id: 'e2222222-2222-2222-2222-222222222222',
      attendee_id: '44444444-4444-4444-4444-444444444444',
      amount_owed: 80.0,
      amount_paid: 80.0,
      is_paid: true,
    },
  ];

  const settings: Record<string, string> = {
    default_landing_page: 'money',
    // "The stag" — hidden from the Money tab. Matches Cooper (The Stag) in
    // this mock dataset; wire this to the real settings row in Supabase.
    stag_attendee_id: '22222222-2222-2222-2222-222222222222',
  };

  // Itinerary days start locked — the schedule is a secret until an admin
  // unlocks each day (see toggleDayLock in app/actions.ts).
  const scheduleDays: ScheduleDay[] = [1, 2, 3, 4].map((day_number) => ({
    day_number,
    is_locked: true,
  }));

  const assassinActions = [
    'Do ten press-ups',
    'Sing a full chorus out loud',
    'Do their best worm impression on the floor',
    'Speak in an American accent for a full minute',
    'Order a drink they have never had before',
    'Give a stranger a compliment about their shoes',
    'Take their shirt off',
    'Do a handstand against a wall',
    'Attempt to speak Spanish to a local for 30 seconds',
    'Carry someone on their back for ten paces',
    'Do the Macarena, all the way through',
    'Down a drink in one',
  ];
  const assassinLocations = [
    'in a crowd',
    'in or beside the pool',
    'in a taxi',
    'at a bar, while ordering',
    'on the beach',
    'in the villa kitchen',
    'within sight of a member of staff',
    'on a balcony or terrace',
    'while everyone is sat down eating',
    'in the street, in daylight',
  ];
  const skateChallenges = [
    '30 press-ups',
    '20 burpees',
    'Hold a plank for 90 seconds',
    '15 pull-ups on anything solid',
    'Down a pint of water in 10 seconds',
  ];

  const gamePrompts: GamePrompt[] = [
    ...assassinActions.map((text) => ({
      id: mockId('prompt'),
      kind: 'assassin',
      category: 'action' as const,
      text,
      is_active: true,
      created_at: new Date().toISOString(),
    })),
    ...assassinLocations.map((text) => ({
      id: mockId('prompt'),
      kind: 'assassin',
      category: 'location' as const,
      text,
      is_active: true,
      created_at: new Date().toISOString(),
    })),
    ...skateChallenges.map((text) => ({
      id: mockId('prompt'),
      kind: 'skate',
      category: 'challenge' as const,
      text,
      is_active: true,
      created_at: new Date().toISOString(),
    })),
  ];

  return {
    attendees,
    scheduleItems,
    scheduleDays,
    expenses,
    expenseAllocations,
    settings,
    games: [] as Game[],
    gamePlayers: [] as GamePlayer[],
    gameRounds: [] as GameRound[],
    gameAssignments: [] as GameAssignment[],
    gameEvents: [] as GameEvent[],
    gamePrompts,
  };
}

if (!globalForMock.__stagMock) {
  globalForMock.__stagMock = seed();
}

export const mockDb = globalForMock.__stagMock;
