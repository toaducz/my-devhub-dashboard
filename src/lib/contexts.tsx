"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { getBrowserClient, isMockMode } from "./supabase";
import type { User } from "@supabase/supabase-js";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthUser {
  id: string;
  email: string;
  user_metadata?: { role?: string; full_name?: string };
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isMock: boolean;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapUser(u: User | null): AuthUser | null {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email ?? "",
    user_metadata: u.user_metadata as { role?: string; full_name?: string },
  };
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  // In mock mode: start as not loading (no async needed)
  const [loading, setLoading] = useState(!isMockMode);

  useEffect(() => {
    if (isMockMode) return; // skip, loading is already false

    const supabase = getBrowserClient();

    // Get current session on mount
    supabase.auth
      .getUser()
      .then(({ data }: { data: { user: User | null } }) => {
        setUser(mapUser(data.user));
        setLoading(false);
      });

    // Listen for auth state changes (login / logout / token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: string, session: { user: User } | null) => {
        setUser(mapUser(session?.user ?? null));
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (isMockMode)
      return { error: new Error("No Supabase configured (mock mode)") };
    const supabase = getBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  }, []);

  const signOut = useCallback(async () => {
    if (!isMockMode) {
      const supabase = getBrowserClient();
      await supabase.auth.signOut();
    }
    setUser(null);
  }, []);

  const ADMIN_EMAIL =
    process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "toaducz@gmail.com";
  const isAdmin =
    isMockMode || // In mock mode, always admin so settings is accessible
    user?.user_metadata?.role === "admin" ||
    user?.email === ADMIN_EMAIL;

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signOut, isAdmin, isMock: isMockMode }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
