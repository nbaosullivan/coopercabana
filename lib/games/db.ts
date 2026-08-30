import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { mockDb, mockId } from '@/lib/mockData';
import {
  Game,
  GameStatus,
  GamePlayer,
  GameRound,
  GameAssignment,
  AssignmentStatus,
  GameEvent,
  GamePrompt,
  PromptCategory,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// Data-access layer for the games engine. Every function branches on
// `isSupabaseConfigured && supabase`, else falls through to the in-memory
// mock store — same pattern as lib/db.ts. Nothing outside lib/games/ (and
// app/games/actions.ts) should import lib/supabase or lib/mockData directly
// for these tables.
// ---------------------------------------------------------------------------

// --- Reads -----------------------------------------------------------------

export async function getGames(): Promise<Game[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Game[];
  }
  return [...mockDb.games].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getGameById(id: string): Promise<Game | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('games').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as Game) ?? null;
  }
  return mockDb.games.find((g) => g.id === id) ?? null;
}

export async function getActiveGames(): Promise<Game[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Game[];
  }
  return mockDb.games
    .filter((g) => g.status === 'active')
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getGamePlayers(gameId: string): Promise<GamePlayer[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('game_players').select('*').eq('game_id', gameId);
    if (error) throw error;
    return data as GamePlayer[];
  }
  return mockDb.gamePlayers.filter((p) => p.game_id === gameId);
}

export async function getRounds(gameId: string): Promise<GameRound[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('game_rounds')
      .select('*')
      .eq('game_id', gameId)
      .order('round_number', { ascending: true });
    if (error) throw error;
    return data as GameRound[];
  }
  return [...mockDb.gameRounds]
    .filter((r) => r.game_id === gameId)
    .sort((a, b) => a.round_number - b.round_number);
}

export async function getCurrentRound(gameId: string): Promise<GameRound | null> {
  const rounds = await getRounds(gameId);
  if (rounds.length === 0) return null;
  return rounds[rounds.length - 1];
}

export async function getAssignmentsForRound(roundId: string): Promise<GameAssignment[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('game_assignments')
      .select('*')
      .eq('round_id', roundId);
    if (error) throw error;
    return data as GameAssignment[];
  }
  return mockDb.gameAssignments.filter((a) => a.round_id === roundId);
}

export async function getAssignmentById(id: string): Promise<GameAssignment | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('game_assignments')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as GameAssignment) ?? null;
  }
  return mockDb.gameAssignments.find((a) => a.id === id) ?? null;
}

export async function getAssignmentsForActor(
  gameId: string,
  actorId: string
): Promise<GameAssignment[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('game_assignments')
      .select('*')
      .eq('game_id', gameId)
      .eq('actor_id', actorId);
    if (error) throw error;
    return data as GameAssignment[];
  }
  return mockDb.gameAssignments.filter((a) => a.game_id === gameId && a.actor_id === actorId);
}

export async function getAssignmentsForArbiter(
  arbiterId: string,
  status: AssignmentStatus
): Promise<GameAssignment[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('game_assignments')
      .select('*')
      .eq('arbiter_id', arbiterId)
      .eq('status', status);
    if (error) throw error;
    return data as GameAssignment[];
  }
  return mockDb.gameAssignments.filter((a) => a.arbiter_id === arbiterId && a.status === status);
}

export async function getEvents(gameId: string, limit: number): Promise<GameEvent[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('game_events')
      .select('*')
      .eq('game_id', gameId)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data as GameEvent[];
  }
  return [...mockDb.gameEvents]
    .filter((e) => e.game_id === gameId && e.is_public)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}

export async function getPrompts(kind: string, category?: PromptCategory): Promise<GamePrompt[]> {
  if (isSupabaseConfigured && supabase) {
    let query = supabase.from('game_prompts').select('*').eq('kind', kind);
    if (category) query = query.eq('category', category);
    const { data, error } = await query;
    if (error) throw error;
    return data as GamePrompt[];
  }
  return mockDb.gamePrompts.filter(
    (p) => p.kind === kind && (!category || p.category === category)
  );
}

// --- Writes ------------------------------------------------------------

export async function createGame(input: {
  kind: Game['kind'];
  title: string;
  config?: Record<string, unknown>;
  created_by?: string | null;
}): Promise<Game> {
  const row = {
    kind: input.kind,
    title: input.title,
    status: 'draft' as GameStatus,
    config: input.config ?? {},
    created_by: input.created_by ?? null,
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('games').insert(row).select().single();
    if (error) throw error;
    return data as Game;
  }

  const game: Game = {
    id: mockId('game'),
    ...row,
    created_at: new Date().toISOString(),
    started_at: null,
    ended_at: null,
  };
  mockDb.games.push(game);
  return game;
}

export async function updateGameStatus(gameId: string, status: GameStatus): Promise<Game> {
  const patch: Partial<Game> = { status };
  if (status === 'active') patch.started_at = new Date().toISOString();
  if (status === 'ended') patch.ended_at = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('games')
      .update(patch)
      .eq('id', gameId)
      .select()
      .single();
    if (error) throw error;
    return data as Game;
  }

  const game = mockDb.games.find((g) => g.id === gameId);
  if (!game) throw new Error('Game not found');
  Object.assign(game, patch);
  return game;
}

export async function addPlayers(
  gameId: string,
  attendeeIds: string[],
  initialState: Record<string, unknown>
): Promise<GamePlayer[]> {
  const rows = attendeeIds.map((attendeeId) => ({
    game_id: gameId,
    attendee_id: attendeeId,
    state: initialState,
    is_out: false,
  }));

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('game_players').insert(rows).select();
    if (error) throw error;
    return data as GamePlayer[];
  }

  const players: GamePlayer[] = rows.map((row) => ({
    id: mockId('gp'),
    ...row,
    joined_at: new Date().toISOString(),
  }));
  mockDb.gamePlayers.push(...players);
  return players;
}

export async function updatePlayerState(
  gameId: string,
  attendeeId: string,
  patch: Record<string, unknown>
): Promise<GamePlayer> {
  if (isSupabaseConfigured && supabase) {
    const { data: existing, error: fetchErr } = await supabase
      .from('game_players')
      .select('*')
      .eq('game_id', gameId)
      .eq('attendee_id', attendeeId)
      .single();
    if (fetchErr) throw fetchErr;
    const mergedState = { ...(existing as GamePlayer).state, ...patch };
    const { data, error } = await supabase
      .from('game_players')
      .update({ state: mergedState })
      .eq('game_id', gameId)
      .eq('attendee_id', attendeeId)
      .select()
      .single();
    if (error) throw error;
    return data as GamePlayer;
  }

  const player = mockDb.gamePlayers.find(
    (p) => p.game_id === gameId && p.attendee_id === attendeeId
  );
  if (!player) throw new Error('Player not found');
  player.state = { ...player.state, ...patch };
  return player;
}

export async function setPlayerOut(
  gameId: string,
  attendeeId: string,
  isOut: boolean
): Promise<GamePlayer> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('game_players')
      .update({ is_out: isOut })
      .eq('game_id', gameId)
      .eq('attendee_id', attendeeId)
      .select()
      .single();
    if (error) throw error;
    return data as GamePlayer;
  }

  const player = mockDb.gamePlayers.find(
    (p) => p.game_id === gameId && p.attendee_id === attendeeId
  );
  if (!player) throw new Error('Player not found');
  player.is_out = isOut;
  return player;
}

export async function createRound(
  gameId: string,
  roundNumber: number,
  payload: Record<string, unknown>
): Promise<GameRound> {
  const row = {
    game_id: gameId,
    round_number: roundNumber,
    status: 'open' as const,
    payload,
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('game_rounds').insert(row).select().single();
    if (error) throw error;
    return data as GameRound;
  }

  const round: GameRound = {
    id: mockId('round'),
    ...row,
    created_at: new Date().toISOString(),
    closed_at: null,
  };
  mockDb.gameRounds.push(round);
  return round;
}

export async function closeRound(roundId: string): Promise<GameRound> {
  const patch = { status: 'closed' as const, closed_at: new Date().toISOString() };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('game_rounds')
      .update(patch)
      .eq('id', roundId)
      .select()
      .single();
    if (error) throw error;
    return data as GameRound;
  }

  const round = mockDb.gameRounds.find((r) => r.id === roundId);
  if (!round) throw new Error('Round not found');
  Object.assign(round, patch);
  return round;
}

export async function getRoundById(roundId: string): Promise<GameRound | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('game_rounds')
      .select('*')
      .eq('id', roundId)
      .maybeSingle();
    if (error) throw error;
    return (data as GameRound) ?? null;
  }
  return mockDb.gameRounds.find((r) => r.id === roundId) ?? null;
}

export async function updateRoundPayload(
  roundId: string,
  payload: Record<string, unknown>
): Promise<GameRound> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('game_rounds')
      .update({ payload })
      .eq('id', roundId)
      .select()
      .single();
    if (error) throw error;
    return data as GameRound;
  }

  const round = mockDb.gameRounds.find((r) => r.id === roundId);
  if (!round) throw new Error('Round not found');
  round.payload = payload;
  return round;
}

export interface CreateAssignmentInput {
  game_id: string;
  round_id: string;
  actor_id: string;
  arbiter_id: string | null;
  payload: Record<string, unknown>;
  visibility: GameAssignment['visibility'];
  status?: AssignmentStatus;
}

export async function createAssignments(
  rows: CreateAssignmentInput[]
): Promise<GameAssignment[]> {
  const withDefaults = rows.map((row) => ({
    ...row,
    status: row.status ?? ('active' as AssignmentStatus),
  }));

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('game_assignments').insert(withDefaults).select();
    if (error) throw error;
    return data as GameAssignment[];
  }

  const assignments: GameAssignment[] = withDefaults.map((row) => ({
    id: mockId('assign'),
    ...row,
    claim_note: null,
    seen_at: null,
    claimed_at: null,
    resolved_at: null,
    resolved_by: null,
    created_at: new Date().toISOString(),
  }));
  mockDb.gameAssignments.push(...assignments);
  return assignments;
}

export async function updateAssignment(
  id: string,
  patch: Partial<GameAssignment>
): Promise<GameAssignment> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('game_assignments')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as GameAssignment;
  }

  const assignment = mockDb.gameAssignments.find((a) => a.id === id);
  if (!assignment) throw new Error('Assignment not found');
  Object.assign(assignment, patch);
  return assignment;
}

export async function markAssignmentSeen(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { data, error: fetchErr } = await supabase
      .from('game_assignments')
      .select('seen_at')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if ((data as { seen_at: string | null } | null)?.seen_at) return;
    const { error } = await supabase
      .from('game_assignments')
      .update({ seen_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    return;
  }

  const assignment = mockDb.gameAssignments.find((a) => a.id === id);
  if (!assignment || assignment.seen_at) return;
  assignment.seen_at = new Date().toISOString();
}

export async function logEvent(input: {
  game_id: string;
  round_id?: string | null;
  assignment_id?: string | null;
  actor_id?: string | null;
  type: string;
  payload?: Record<string, unknown>;
  is_public: boolean;
}): Promise<GameEvent> {
  const row = {
    game_id: input.game_id,
    round_id: input.round_id ?? null,
    assignment_id: input.assignment_id ?? null,
    actor_id: input.actor_id ?? null,
    type: input.type,
    payload: input.payload ?? {},
    is_public: input.is_public,
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('game_events').insert(row).select().single();
    if (error) throw error;
    return data as GameEvent;
  }

  const event: GameEvent = {
    id: mockId('event'),
    ...row,
    created_at: new Date().toISOString(),
  };
  mockDb.gameEvents.push(event);
  return event;
}

export async function createPrompt(
  kind: string,
  category: PromptCategory,
  text: string
): Promise<GamePrompt> {
  const row = { kind, category, text, is_active: true };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('game_prompts').insert(row).select().single();
    if (error) throw error;
    return data as GamePrompt;
  }

  const prompt: GamePrompt = {
    id: mockId('prompt'),
    ...row,
    created_at: new Date().toISOString(),
  };
  mockDb.gamePrompts.push(prompt);
  return prompt;
}

export async function setPromptActive(id: string, isActive: boolean): Promise<GamePrompt> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('game_prompts')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as GamePrompt;
  }

  const prompt = mockDb.gamePrompts.find((p) => p.id === id);
  if (!prompt) throw new Error('Prompt not found');
  prompt.is_active = isActive;
  return prompt;
}

export async function deletePrompt(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('game_prompts').delete().eq('id', id);
    if (error) throw error;
    return;
  }

  const idx = mockDb.gamePrompts.findIndex((p) => p.id === id);
  if (idx !== -1) mockDb.gamePrompts.splice(idx, 1);
}
