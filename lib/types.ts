export type TshirtSize = 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL';

// --- Settings -----------------------------------------------------------

/** Valid tabs in the bottom nav — the set of allowed landing pages. */
export const LANDING_PAGES = ['schedule', 'money', 'flights', 'tasks'] as const;
export type LandingPageKey = (typeof LANDING_PAGES)[number];

/** Used when the settings table has no row yet (or an invalid value). */
export const DEFAULT_LANDING_PAGE: LandingPageKey = 'money';

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

/**
 * Sentinel stored in the NOT NULL `pin` column for attendees who haven't
 * picked a personal PIN yet. They log in once with the group password and
 * are prompted to set their own PIN, which replaces this value.
 */
export const PIN_UNSET = '*';

/**
 * Attendee shape safe to send to the client — never includes the PIN value,
 * only whether one has been set (so the login screen can prompt correctly).
 */
export type PublicAttendee = Omit<Attendee, 'pin'> & { has_pin: boolean };

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

/**
 * Lock state for one itinerary day. Days start locked so the itinerary stays
 * a secret until an admin (the organiser) unlocks them for the group.
 */
export interface ScheduleDay {
  day_number: number;
  is_locked: boolean;
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
  /** True when they logged in via group password and must now set a PIN. */
  needsPinSetup?: boolean;
}

// --- Games engine ---------------------------------------------------------

export const GAME_KINDS = ['assassin', 'skate'] as const;
export type GameKind = (typeof GAME_KINDS)[number];

export type GameStatus = 'draft' | 'active' | 'ended';
export type RoundStatus = 'open' | 'closed';
export type AssignmentStatus =
  | 'active'
  | 'claimed'
  | 'succeeded'
  | 'failed'
  | 'disputed'
  | 'void';
export type AssignmentVisibility = 'private' | 'public';
export type PromptCategory = 'action' | 'location' | 'challenge';

export interface Game {
  id: string;
  kind: GameKind;
  title: string;
  status: GameStatus;
  config: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface GamePlayer {
  id: string;
  game_id: string;
  attendee_id: string;
  state: Record<string, unknown>;
  is_out: boolean;
  joined_at: string;
}

export interface GameRound {
  id: string;
  game_id: string;
  round_number: number;
  status: RoundStatus;
  payload: Record<string, unknown>;
  created_at: string;
  closed_at: string | null;
}

export interface GameAssignment {
  id: string;
  game_id: string;
  round_id: string;
  actor_id: string;
  arbiter_id: string | null;
  payload: Record<string, unknown>;
  visibility: AssignmentVisibility;
  status: AssignmentStatus;
  claim_note: string | null;
  seen_at: string | null;
  claimed_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export interface GameEvent {
  id: string;
  game_id: string;
  round_id: string | null;
  assignment_id: string | null;
  actor_id: string | null;
  type: string;
  payload: Record<string, unknown>;
  is_public: boolean;
  created_at: string;
}

export interface GamePrompt {
  id: string;
  kind: string;
  category: PromptCategory;
  text: string;
  is_active: boolean;
  created_at: string;
}

// --- Kind-specific payload shapes ----------------------------------------

export interface AssassinPayload {
  target_id: string;
  action: string;
  location: string;
}

export interface AssassinPlayerState {
  score: number;
}

export interface SkateRoundPayload {
  setter_id: string;
  challenge: string;
  /**
   * 'setting'  - the setter is attempting their own challenge; nobody else
   *              has an assignment yet.
   * 'chasing'  - the setter landed it; everyone else must now match it.
   */
  phase: 'setting' | 'chasing';
  /** null while phase is 'setting'. false ends the round with no letters. */
  setter_landed: boolean | null;
}

export interface SkatePlayerState {
  letters: string; // e.g. "SK"
}

// --- Client-facing view models -------------------------------------------

/** Everything one player needs to render their view of one game. */
export interface GameSnapshot {
  game: Game;
  players: Array<{
    attendee: PublicAttendee;
    state: Record<string, unknown>;
    is_out: boolean;
  }>;
  currentRound: GameRound | null;
  /** The signed-in player's own assignment for the current round. */
  myAssignment: GameAssignment | null;
  /** Assignments awaiting THIS player's confirmation as arbiter. */
  awaitingMyVerdict: GameAssignment[];
  /** Public assignments (SKATE) for the current round. Never private ones. */
  publicAssignments: GameAssignment[];
  /** Most recent public events, newest first, capped at 30. */
  feed: GameEvent[];
  /** True when the player has an assignment they have not opened yet. */
  hasUnseen: boolean;
}

export function stripPin(a: Attendee): PublicAttendee {
  const { pin, ...rest } = a;
  return { ...rest, has_pin: pin !== PIN_UNSET };
}
