import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const isMockMode = !supabaseUrl || !supabaseAnonKey;

export { createBrowserClient, createServerClient };

// ─── Browser client (Client Components) ─────────────────────────────────────
// Singleton pattern — safe to call multiple times on client side
let _browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserClient() {
  if (isMockMode) return getMockClient();
  if (!_browserClient) {
    _browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  return _browserClient;
}

// ─── Server client (Route Handlers / Server Components) ─────────────────────
// Must be called with a cookieStore per request — do NOT cache
export function getServerClient(cookieStore: ReadonlyRequestCookies) {
  if (isMockMode) return getMockClient();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // No-op in Route Handlers (response cookies set by middleware)
      },
    },
  });
}

// ─── Legacy export — kept for backward compatibility ────────────────────────
// Route Handlers that import supabaseClient directly still work in mock mode
export const supabaseClient = isMockMode ? getMockClient() : getBrowserClient();

// ─── Admin client (Server-side, bypasses RLS) ────────────────────────────────
// Uses service role key — NEVER expose to the browser

let _adminClient: ReturnType<typeof createClient> | null = null;

export function getAdminClient() {
  if (isMockMode || !supabaseServiceRoleKey) return getMockClient();
  if (!_adminClient) {
    _adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });
  }
  return _adminClient;
}

// ─── Mock client for development without Supabase ───────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMockClient(): any {
  return {
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: [], error: null }),
        order: () => Promise.resolve({ data: [], error: null }),
        single: () => Promise.resolve({ data: null, error: null }),
      }),
      insert: () => ({
        select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
      }),
      update: () => ({
        eq: () => ({
          select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
        }),
      }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signInWithPassword: () =>
        Promise.resolve({ data: { user: null, session: null }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    channel: () => ({ on: () => ({ subscribe: () => {} }), subscribe: () => {} }),
    removeChannel: () => {},
  };
}

// ─── Helper hook for components ──────────────────────────────────────────────
export function useSupabase() {
  return { supabase: getBrowserClient(), isMock: isMockMode };
}
