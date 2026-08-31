import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

// `supabase` is null whenever env vars are absent — every call site in
// lib/db.ts checks `isSupabaseConfigured` first and reads from the mock
// dataset instead, so the app never throws because of a missing client.
//
// IMPORTANT: Next.js patches the global `fetch` in Server Components/actions
// and caches GET responses by default (its "Data Cache"), independent of
// page-level dynamic rendering. Supabase-js's queries are plain GET fetches,
// so without this override every read (settings, attendees, allocations,
// schedule locks, ...) could silently serve a stale response from the very
// first time it ran — e.g. editing `settings` in the Supabase dashboard
// would never be reflected. Force every Supabase request to bypass that
// cache so the app always sees current data.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      global: {
        fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
      },
    })
  : null;
