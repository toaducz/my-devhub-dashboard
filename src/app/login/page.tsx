"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/contexts";

// ─── Inner component (uses useSearchParams — must be inside Suspense) ────────

function LoginContent() {
  const { signIn, user, loading, isMock } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect_to") || "/settings";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in → redirect
  useEffect(() => {
    if (!loading && user) {
      router.push(redirectTo);
      router.refresh();
    }
  }, [user, loading, router, redirectTo]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0c0c0c", color: "#525252", fontSize: 13 }}>
        checking session...
      </div>
    );
  }

  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: authError } = await signIn(email.trim(), password);

    if (authError) {
      setError(authError.message);
      setIsSubmitting(false);
      return;
    }

    // router.refresh() triggers middleware to re-check session cookie
    router.push(redirectTo);
    router.refresh();
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#0c0c0c",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          padding: 32,
          background: "#171717",
          border: "1px solid #1f1f1f",
          borderRadius: 8,
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ color: "#22c55e", fontSize: 18, fontWeight: 700, fontFamily: "monospace" }}>~</span>
            <span style={{ color: "#e5e5e5", fontSize: 15, fontWeight: 600 }}>devhub</span>
            <span style={{ color: "#525252", fontSize: 15 }}>_central</span>
          </div>
          <p style={{ margin: 0, color: "#525252", fontSize: 12 }}>
            admin_login
          </p>
        </div>

        {/* Mock mode warning */}
        {isMock && (
          <div
            style={{
              padding: "10px 12px",
              marginBottom: 16,
              background: "rgba(245, 158, 11, 0.08)",
              border: "1px solid #854d0e",
              color: "#f59e0b",
              fontSize: 11,
              borderRadius: 4,
              fontFamily: "monospace",
            }}
          >
            ⚠ mock_mode: Supabase chưa được cấu hình. Đặt NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY trong .env
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              padding: "10px 12px",
              marginBottom: 16,
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid #ef4444",
              color: "#ef4444",
              fontSize: 12,
              borderRadius: 4,
              fontFamily: "monospace",
            }}
          >
            ✗ {error}
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <div>
            <label style={{ display: "block", color: "#737373", fontSize: 11, marginBottom: 6, fontFamily: "monospace" }}>
              email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting || isMock}
              autoComplete="email"
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "#0c0c0c",
                border: "1px solid #2a2a2a",
                color: "#e5e5e5",
                fontSize: 13,
                fontFamily: "inherit",
                borderRadius: 4,
                boxSizing: "border-box",
                outline: "none",
              }}
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label style={{ display: "block", color: "#737373", fontSize: 11, marginBottom: 6, fontFamily: "monospace" }}>
              password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting || isMock}
              autoComplete="current-password"
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "#0c0c0c",
                border: "1px solid #2a2a2a",
                color: "#e5e5e5",
                fontSize: 13,
                fontFamily: "inherit",
                borderRadius: 4,
                boxSizing: "border-box",
                outline: "none",
              }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isMock}
            style={{
              width: "100%",
              padding: "11px",
              marginTop: 4,
              background: isSubmitting || isMock ? "#1f1f1f" : "#22c55e",
              border: "none",
              color: isSubmitting || isMock ? "#404040" : "#0c0c0c",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "inherit",
              borderRadius: 4,
              cursor: isSubmitting || isMock ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "background 0.15s",
            }}
          >
            {isSubmitting ? (
              <>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    border: "2px solid #404040",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                signing_in...
              </>
            ) : (
              "sign_in →"
            )}
          </button>
        </form>

        <p style={{ marginTop: 20, color: "#404040", fontSize: 11, textAlign: "center", fontFamily: "monospace" }}>
          only_admin_access
        </p>
      </div>
    </div>
  );
}

// ─── Default export with Suspense boundary ───────────────────────────────────

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
