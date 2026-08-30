-- Stag Do Organiser — Supabase Postgres schema + seed data
-- Run this in the Supabase SQL editor for a fresh project.

-- Extensions needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- Drop existing tables
DROP TABLE IF EXISTS expense_allocations;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS schedule_items;
DROP TABLE IF EXISTS attendees;
DROP TABLE IF EXISTS settings;

-- 0. App settings (key/value config — e.g. default landing tab)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1. Attendees
CREATE TABLE attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  pin TEXT NOT NULL DEFAULT '1234',
  is_admin BOOLEAN DEFAULT FALSE,
  tshirt_size TEXT DEFAULT NULL CHECK (tshirt_size IN ('S', 'M', 'L', 'XL', '2XL', '3XL')),
  flights_booked BOOLEAN DEFAULT FALSE,
  outbound_flight_details TEXT,
  outbound_arrival_time TIMESTAMPTZ,
  return_flight_details TEXT,
  return_departure_time TIMESTAMPTZ
);

-- 2. Itinerary / Schedule Items
CREATE TABLE schedule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_number INT NOT NULL CHECK (day_number BETWEEN 1 AND 4),
  start_time TIME NOT NULL,
  end_time TIME,
  title TEXT NOT NULL,
  description TEXT,
  location_name TEXT,
  address TEXT,
  google_maps_url TEXT,
  uber_url TEXT
);

-- 3. Expenses
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  total_cost NUMERIC(10, 2) NOT NULL,
  notes TEXT
);

-- 4. Expense Allocations per Person
CREATE TABLE expense_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  attendee_id UUID REFERENCES attendees(id) ON DELETE CASCADE,
  amount_owed NUMERIC(10, 2) NOT NULL,
  amount_paid NUMERIC(10, 2) DEFAULT 0.00,
  is_paid BOOLEAN DEFAULT FALSE,
  UNIQUE(expense_id, attendee_id)
);

-- SEED DATA

-- Default landing tab: 'money' for now. Switch to 'schedule' (or any of
-- schedule/money/flights/tasks) by updating this row later — no code change.
INSERT INTO settings (key, value) VALUES
('default_landing_page', 'money');

INSERT INTO attendees (id, name, pin, is_admin, tshirt_size, flights_booked, outbound_flight_details, outbound_arrival_time, return_flight_details, return_departure_time) VALUES
('11111111-1111-1111-1111-111111111111', 'Nick (Organiser)', '1234', TRUE, 'L', TRUE, 'EZY8201 (GVA -> AGP)', '2026-09-01T12:30:00Z', 'EZY8202 (AGP -> GVA)', '2026-09-04T16:00:00Z'),
('22222222-2222-2222-2222-222222222222', 'Cooper (The Stag)', '1234', FALSE, 'XL', TRUE, 'BA0452 (LHR -> AGP)', '2026-09-01T10:00:00Z', 'BA0453 (AGP -> LHR)', '2026-09-04T18:15:00Z'),
('33333333-3333-3333-3333-333333333333', 'Carl', '1234', FALSE, 'M', FALSE, NULL, NULL, NULL, NULL),
('44444444-4444-4444-4444-444444444444', 'Dave', '1234', FALSE, 'L', TRUE, 'FR2104 (STN -> AGP)', '2026-09-01T13:10:00Z', 'FR2105 (AGP -> STN)', '2026-09-04T14:30:00Z');

INSERT INTO schedule_items (day_number, start_time, end_time, title, description, location_name, address, google_maps_url, uber_url) VALUES
(1, '15:00', '19:00', 'Villa Check-In & Welcome Drinks', 'Grab rooms, stock fridge, get pool ready.', 'Villa Coopercabana', 'Calle Benalmádena 12, Málaga', 'https://maps.google.com/?q=Calle+Benalmadena+12+Malaga', 'https://m.uber.com/ul/?action=setPickup&dropoff[formatted_address]=Calle%20Benalm%C3%A1dena%2012%2C%20M%C3%A1laga'),
(1, '20:00', '23:30', 'Tapas & Old Town Drinks', 'Casual dinner in downtown historic center.', 'El Pimpi', 'Calle Granada 62, Málaga', 'https://maps.google.com/?q=El+Pimpi+Malaga', 'https://m.uber.com/ul/?action=setPickup&dropoff[formatted_address]=Calle%20Granada%2062%2C%20M%C3%A1laga'),
(2, '11:00', '14:00', '270cc Outdoor Go-Karting Championship', 'Grand Prix format: Qualifying + 20-lap race. Trophy for 1st.', 'Karting Experience', 'Carretera Coín Km 5, Málaga', 'https://maps.google.com/?q=Karting+Experience+Malaga', 'https://m.uber.com/ul/?action=setPickup&dropoff[formatted_address]=Carretera%20Co%C3%ADn%20Km%205%2C%20M%C3%A1laga'),
(2, '17:00', '21:00', 'Sunset Catamaran Boat Party', '4-hour cruise with open bar and DJ set.', 'Puerto Marina', 'Paseo Marítimo, Benalmádena', 'https://maps.google.com/?q=Puerto+Marina+Benalmadena', 'https://m.uber.com/ul/?action=setPickup&dropoff[formatted_address]=Puerto%20Marina%20Benalm%C3%A1dena');

INSERT INTO expenses (id, title, total_cost, notes) VALUES
('e1111111-1111-1111-1111-111111111111', 'Luxury Villa (4 Nights)', 1200.00, 'Revolut / Bank Transfer to Nick'),
('e2222222-2222-2222-2222-222222222222', 'Outdoor Go-Karting Grand Prix', 320.00, 'Includes helmet rental & track timing'),
('e3333333-3333-3333-3333-333333333333', 'Private Catamaran Boat Charter', 600.00, 'Paid in advance');

INSERT INTO expense_allocations (expense_id, attendee_id, amount_owed, amount_paid, is_paid) VALUES
('e1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 300.00, 300.00, TRUE),
('e1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 300.00, 300.00, TRUE),
('e1111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 300.00, 0.00, FALSE),
('e1111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 300.00, 0.00, FALSE),
('e2222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 80.00, 0.00, FALSE),
('e2222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 80.00, 80.00, TRUE);

-- Row Level Security: kept open for a small trusted-link app (no PII beyond first names).
-- Tighten these policies if you plan to expose this beyond your group.
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_allocations ENABLE ROW LEVEL SECURITY;

-- Settings are read-only at runtime (writes happen in the SQL editor / dashboard).
CREATE POLICY "public read settings" ON settings FOR SELECT USING (true);
CREATE POLICY "public read/write attendees" ON attendees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public read schedule_items" ON schedule_items FOR SELECT USING (true);
CREATE POLICY "public read expenses" ON expenses FOR SELECT USING (true);
CREATE POLICY "public read/write expense_allocations" ON expense_allocations FOR ALL USING (true) WITH CHECK (true);

-- ===========================================================================
-- GAMES ENGINE
-- Generic scaffolding shared by every mini-game. A game "kind" is just a
-- string; the app layer knows how to render and resolve each one.
-- ===========================================================================

DROP TABLE IF EXISTS game_events;
DROP TABLE IF EXISTS game_assignments;
DROP TABLE IF EXISTS game_rounds;
DROP TABLE IF EXISTS game_players;
DROP TABLE IF EXISTS game_prompts;
DROP TABLE IF EXISTS games;

-- A single instance of a mini-game.
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('assassin', 'skate')),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'ended')),
  -- Kind-specific settings. assassin: {}, skate: { "word": "SKATE" }
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES attendees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

-- Who is in a game, and their running state.
-- assassin: { "score": 0 }   skate: { "letters": "SK" }
CREATE TABLE game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  attendee_id UUID NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_out BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, attendee_id)
);

-- A unit of play. assassin: one deal of missions. skate: one "set".
-- skate payload: { "setter_id": "...", "challenge": "30 push ups",
--                  "phase": "setting" | "chasing", "setter_landed": true|false|null }
CREATE TABLE game_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  UNIQUE (game_id, round_number)
);

-- One player's obligation inside a round. THE core table.
-- assassin payload: { "target_id": "...", "action": "moon someone",
--                     "location": "in a crowd" }   visibility 'private'
-- skate payload:    { "challenge": "30 push ups" } visibility 'public'
CREATE TABLE game_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES game_rounds(id) ON DELETE CASCADE,
  -- The player who must DO something.
  actor_id UUID NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
  -- Who is allowed to confirm/deny a claim. assassin: the target.
  -- skate: the setter. NULL = admin-only resolution.
  arbiter_id UUID REFERENCES attendees(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'claimed', 'succeeded', 'failed', 'disputed', 'void')),
  claim_note TEXT,
  seen_at TIMESTAMPTZ,      -- powers the "new mission" badge + briefing modal
  claimed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES attendees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX game_assignments_actor_idx ON game_assignments (actor_id, status);
CREATE INDEX game_assignments_arbiter_idx ON game_assignments (arbiter_id, status);
CREATE INDEX game_assignments_round_idx ON game_assignments (round_id);

-- Append-only feed. Drives the "what's happening" ticker and is the audit
-- trail when someone insists they definitely did the thing.
CREATE TABLE game_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round_id UUID REFERENCES game_rounds(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES game_assignments(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES attendees(id) ON DELETE SET NULL,
  type TEXT NOT NULL,     -- game_started | round_opened | claimed | confirmed
                          -- | denied | letter_given | admin_override | game_ended
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- FALSE while it would spoil a live mission; flipped TRUE on resolution.
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX game_events_game_idx ON game_events (game_id, created_at DESC);

-- Admin-editable content pools. Assassin draws one 'action' + one 'location'.
CREATE TABLE game_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL DEFAULT 'assassin',
  category TEXT NOT NULL CHECK (category IN ('action', 'location', 'challenge')),
  text TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX game_prompts_pool_idx ON game_prompts (kind, category, is_active);

INSERT INTO game_prompts (kind, category, text) VALUES
('assassin', 'action', 'Do ten press-ups'),
('assassin', 'action', 'Sing a full chorus out loud'),
('assassin', 'action', 'Do their best worm impression on the floor'),
('assassin', 'action', 'Speak in an American accent for a full minute'),
('assassin', 'action', 'Order a drink they have never had before'),
('assassin', 'action', 'Give a stranger a compliment about their shoes'),
('assassin', 'action', 'Take their shirt off'),
('assassin', 'action', 'Do a handstand against a wall'),
('assassin', 'action', 'Attempt to speak Spanish to a local for 30 seconds'),
('assassin', 'action', 'Carry someone on their back for ten paces'),
('assassin', 'action', 'Do the Macarena, all the way through'),
('assassin', 'action', 'Down a drink in one'),
('assassin', 'location', 'in a crowd'),
('assassin', 'location', 'in or beside the pool'),
('assassin', 'location', 'in a taxi'),
('assassin', 'location', 'at a bar, while ordering'),
('assassin', 'location', 'on the beach'),
('assassin', 'location', 'in the villa kitchen'),
('assassin', 'location', 'within sight of a member of staff'),
('assassin', 'location', 'on a balcony or terrace'),
('assassin', 'location', 'while everyone is sat down eating'),
('assassin', 'location', 'in the street, in daylight');

INSERT INTO game_prompts (kind, category, text) VALUES
('skate', 'challenge', '30 press-ups'),
('skate', 'challenge', '20 burpees'),
('skate', 'challenge', 'Hold a plank for 90 seconds'),
('skate', 'challenge', '15 pull-ups on anything solid'),
('skate', 'challenge', 'Down a pint of water in 10 seconds');

ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read/write games" ON games FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public read/write game_players" ON game_players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public read/write game_rounds" ON game_rounds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public read/write game_assignments" ON game_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public read/write game_events" ON game_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public read/write game_prompts" ON game_prompts FOR ALL USING (true) WITH CHECK (true);

