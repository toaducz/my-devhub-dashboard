"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts";
import type { Project } from "@/types/project";
import Cookies from "js-cookie";

const VERCEL_COOKIE = "vercel_token";

// Initialize state from cookies
function getStoredToken() {
  if (typeof window === "undefined") return "";
  return Cookies.get(VERCEL_COOKIE) || "";
}

// ─── Toast notification ───────────────────────────────────────────────────────
type ToastType = "success" | "error" | "info";
interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      4000
    );
  }, []);
  return { toasts, show };
}

export default function SettingsPage() {
  const [vercelToken, setVercelToken] = useState(getStoredToken);
  const [isConnected, setIsConnected] = useState(
    () => !!Cookies.get(VERCEL_COOKIE)
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    added: number;
    total: number;
  } | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [hasEnvToken, setHasEnvToken] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { toasts, show: showToast } = useToast();
  const { user, signOut, isMock } = useAuth();

  // Check if VERCEL_API_TOKEN is configured in .env (server-side)
  useEffect(() => {
    const checkEnvToken = async () => {
      try {
        const res = await fetch("/api/vercel/check-token");
        const json = (await res.json()) as { hasToken: boolean };
        setHasEnvToken(json.hasToken);
      } catch {
        setHasEnvToken(false);
      }
    };
    checkEnvToken();
  }, []);

  const handleLogout = useCallback(async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  }, [signOut, router]);

  // Load projects count từ /api/projects (serverless)
  const loadProjects = useCallback(async () => {
    try {
      setIsLoadingProjects(true);
      const res = await fetch("/api/projects");
      if (res.ok) {
        const json = (await res.json()) as { data: Project[] };
        setProjects(json.data);
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // ─── Verify token qua /api/vercel rồi mới save cookie ─────────────────────
  const handleSaveToken = async () => {
    const trimmed = vercelToken.trim();
    if (!trimmed) {
      showToast("Token không được để trống", "error");
      return;
    }
    setIsVerifying(true);
    try {
      const res = await fetch("/api/vercel", {
        headers: { Authorization: `Bearer ${trimmed}` },
      });
      if (!res.ok) {
        const err = (await res.json()) as { error: string };
        showToast(`Token không hợp lệ: ${err.error}`, "error");
        return;
      }
      // Token OK → lưu vào cookie
      Cookies.set(VERCEL_COOKIE, trimmed, {
        expires: 30,
        secure: true,
        sameSite: "strict",
      });
      setIsConnected(true);
      showToast("Đã kết nối Vercel thành công!", "success");
    } catch {
      showToast("Không thể kết nối đến Vercel API", "error");
    } finally {
      setIsVerifying(false);
    }
  };

  // ─── Sync: gọi /api/vercel → upsert từng project qua /api/projects ─────────
  const handleSyncNow = async () => {
    const token = Cookies.get(VERCEL_COOKIE);
    if (!token) {
      showToast("Chưa kết nối Vercel", "error");
      return;
    }
    setIsSyncing(true);
    setSyncResult(null);
    try {
      // 1. Fetch từ Vercel
      const vercelRes = await fetch("/api/vercel", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const responseBody = await vercelRes.json();

      if (!vercelRes.ok) {
        throw new Error(
          (responseBody as { error?: string }).error ||
            "Không lấy được projects từ Vercel"
        );
      }

      const { data: vercelProjects, warnings } = responseBody as {
        data: Array<{
          id: string;
          name: string;
          framework: string | null;
          url: string | null;
          state: string;
        }>;
        warnings?: string[];
      };

      // Log warnings if any
      if (warnings && warnings.length > 0) {
        console.warn("[handleSyncNow] API warnings:", warnings);
      }

      console.log(
        "[handleSyncNow] Received",
        vercelProjects.length,
        "projects from Vercel"
      );

      // 2. Lấy projects hiện tại để tránh duplicate
      const existingRes = await fetch("/api/projects");
      const { data: existing } = (await existingRes.json()) as {
        data: Project[];
      };
      const existingVercelIds = new Set(
        existing.map((p) => p.vercel_project_id).filter(Boolean)
      );

      // 3. Upsert project mới
      let added = 0;
      for (const vp of vercelProjects) {
        if (existingVercelIds.has(vp.id)) continue;
        const url = vp.url
          ? `https://${vp.url}`
          : `https://${vp.name}.vercel.app`;
        await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: vp.name,
            description: `Vercel project${
              vp.framework ? ` · ${vp.framework}` : ""
            }`,
            url,
            category: "active",
            platforms: ["Vercel"],
            techStack: vp.framework ? [vp.framework] : [],
            isLive: vp.state === "READY",
            isPrivate: false,
          }),
        });
        added++;
      }

      setSyncResult({ added, total: vercelProjects.length });
      showToast(
        added > 0
          ? `Sync xong! Thêm ${added}/${vercelProjects.length} project mới`
          : `Đã có đầy đủ ${vercelProjects.length} projects, không có gì mới`,
        "success"
      );
      await loadProjects(); // Refresh count
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      showToast(`Sync thất bại: ${msg}`, "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = () => {
    Cookies.remove(VERCEL_COOKIE);
    setVercelToken("");
    setIsConnected(false);
    setSyncResult(null);
    showToast("Đã ngắt kết nối Vercel", "info");
  };

  return (
    <>
      <div style={{ display: "flex", height: "100vh", background: "#0c0c0c" }}>
        {/* Sidebar */}
        <aside
          className="flex flex-col gap-6 shrink-0"
          style={{
            width: 240,
            height: "100vh",
            background: "#0c0c0c",
            borderRight: "1px solid #1f1f1f",
            padding: "32px 20px",
            position: "sticky",
            top: 0,
          }}
        >
          <div className="flex items-center gap-2">
            <span style={{ color: "#22c55e", fontSize: 20, fontWeight: 600 }}>
              ~
            </span>
            <span style={{ color: "#e5e5e5", fontSize: 16, fontWeight: 600 }}>
              devhub
            </span>
            <span style={{ color: "#737373", fontSize: 16 }}>_central</span>
          </div>

          <nav className="flex flex-col gap-1">
            <span style={{ color: "#525252", fontSize: 11, marginBottom: 4 }}>
              navigation
            </span>
            <Link
              href="/"
              className="flex items-center gap-2 transition-colors"
              style={{
                padding: "8px 12px",
                background: pathname === "/" ? "#1a1a1a" : "transparent",
                color: pathname === "/" ? "#e5e5e5" : "#737373",
                fontSize: 13,
                fontWeight: pathname === "/" ? 500 : 400,
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  width: 14,
                  fontSize: 13,
                  color: pathname === "/" ? "#22c55e" : "#525252",
                  fontFamily: "monospace",
                }}
              >
                {pathname === "/" ? ">" : "⊞"}
              </span>
              all_projects
            </Link>
            <Link
              href="/health"
              className="flex items-center gap-2 transition-colors"
              style={{
                padding: "8px 12px",
                background: pathname === "/health" ? "#1a1a1a" : "transparent",
                color: pathname === "/health" ? "#e5e5e5" : "#737373",
                fontSize: 13,
                fontWeight: pathname === "/health" ? 500 : 400,
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  width: 14,
                  fontSize: 13,
                  color: pathname === "/health" ? "#22c55e" : "#525252",
                  fontFamily: "monospace",
                }}
              >
                {pathname === "/health" ? ">" : "◈"}
              </span>
              health_check
            </Link>
            <Link
              href="/tags"
              className="flex items-center gap-2 transition-colors"
              style={{
                padding: "8px 12px",
                background: pathname === "/tags" ? "#1a1a1a" : "transparent",
                color: pathname === "/tags" ? "#e5e5e5" : "#737373",
                fontSize: 13,
                fontWeight: pathname === "/tags" ? 500 : 400,
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  width: 14,
                  fontSize: 13,
                  color: pathname === "/tags" ? "#22c55e" : "#525252",
                  fontFamily: "monospace",
                }}
              >
                {pathname === "/tags" ? ">" : "#"}
              </span>
              tags
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-2 transition-colors"
              style={{
                padding: "8px 12px",
                background:
                  pathname === "/settings" ? "#1a1a1a" : "transparent",
                color: pathname === "/settings" ? "#e5e5e5" : "#737373",
                fontSize: 13,
                fontWeight: pathname === "/settings" ? 500 : 400,
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  width: 14,
                  fontSize: 13,
                  color: pathname === "/settings" ? "#22c55e" : "#525252",
                  fontFamily: "monospace",
                }}
              >
                {pathname === "/settings" ? ">" : "⚙"}
              </span>
              settings
            </Link>
          </nav>

          <div className="flex flex-col gap-1">
            <span style={{ color: "#525252", fontSize: 11, marginBottom: 4 }}>
              categories
            </span>
            <button
              className="flex items-center justify-between w-full transition-colors"
              style={{
                padding: "6px 12px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <span style={{ color: "#737373", fontSize: 12 }}>all</span>
              <span style={{ color: "#525252", fontSize: 11 }}>
                {isLoadingProjects ? "..." : projects.length}
              </span>
            </button>
          </div>

          <div className="flex-1" />

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* User info */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 0",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: user ? "#22c55e" : "#525252",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    color: "#a3a3a3",
                    fontSize: 12,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user?.email ?? (isMock ? "mock_mode" : "guest")}
                </div>
                <div style={{ color: "#525252", fontSize: 10, marginTop: 1 }}>
                  admin
                </div>
              </div>
            </div>

            {/* Logout button */}
            {!isMock && (
              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  padding: "7px 12px",
                  background: "transparent",
                  border: "1px solid #2a2a2a",
                  color: "#525252",
                  fontSize: 11,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  textAlign: "left",
                  borderRadius: 4,
                  transition: "border-color 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "#ef4444";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "#ef4444";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "#2a2a2a";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "#525252";
                }}
              >
                sign_out →
              </button>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, padding: "32px 40px", overflowY: "auto" }}>
          <div style={{ marginBottom: 24 }}>
            <h1
              style={{
                margin: 0,
                color: "#e5e5e5",
                fontSize: 24,
                fontWeight: 600,
                fontFamily: "inherit",
              }}
            >
              settings
            </h1>
            <p
              style={{
                margin: 0,
                color: "#525252",
                fontSize: 12,
                marginTop: 4,
              }}
            >
              configure integrations and manage preferences
            </p>
          </div>

          {/* Vercel Integration */}
          <div
            style={{
              padding: "20px",
              background: "#171717",
              border: "1px solid #1f1f1f",
              marginBottom: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  background: "#0c0c0c",
                  border: "1px solid #1f1f1f",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: 20 }}>V</span>
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    color: "#e5e5e5",
                    fontSize: 16,
                    fontWeight: 600,
                  }}
                >
                  Vercel Integration
                </h3>
                <p style={{ margin: 0, color: "#737373", fontSize: 12 }}>
                  {isConnected ? "Connected" : "Not connected"} • Auto-sync
                  projects from Vercel
                </p>
              </div>
              <div
                style={{
                  marginLeft: "auto",
                  padding: "4px 12px",
                  background: isConnected ? "#22c55e" : "#525252",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 500,
                }}
              >
                {isConnected ? "active" : "inactive"}
              </div>
            </div>

            {hasEnvToken ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div
                  style={{
                    padding: "12px",
                    background: "#0c0c0c",
                    border: "1px solid #1f1f1f",
                    borderRadius: 4,
                    fontSize: 12,
                    color: "#a3a3a3",
                  }}
                >
                  Vercel token được cấu hình từ environment variable
                  (VERCEL_API_TOKEN). Token từ .env có priority cao nhất và
                  không cần lưu vào cookie.
                  {isConnected && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: "8px",
                        background: "#171717",
                        borderRadius: 4,
                      }}
                    >
                      <span style={{ color: "#22c55e" }}>●</span>{" "}
                      <span style={{ color: "#737373" }}>
                        Cookie token cũng đã được lưu và có thể dùng fallback
                      </span>
                    </div>
                  )}
                </div>
                {isConnected && (
                  <button
                    onClick={handleDisconnect}
                    style={{
                      padding: "8px 16px",
                      background: "transparent",
                      border: "1px solid #2a2a2a",
                      color: "#ef4444",
                      fontSize: 11,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      borderRadius: 4,
                      alignSelf: "flex-start",
                    }}
                  >
                    xóa cookie fallback
                  </button>
                )}
              </div>
            ) : !isConnected ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <input
                    type="password"
                    value={vercelToken}
                    onChange={(e) => setVercelToken(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveToken()}
                    placeholder="paste your Vercel API token..."
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      background: "#0c0c0c",
                      border: "1px solid #1f1f1f",
                      color: "#e5e5e5",
                      fontSize: 13,
                      fontFamily: "inherit",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={handleSaveToken}
                    disabled={!vercelToken.trim() || isVerifying}
                    style={{
                      padding: "10px 20px",
                      background:
                        vercelToken.trim() && !isVerifying
                          ? "#22c55e"
                          : "#171717",
                      border: "none",
                      color:
                        vercelToken.trim() && !isVerifying
                          ? "#0c0c0c"
                          : "#525252",
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "inherit",
                      cursor:
                        vercelToken.trim() && !isVerifying
                          ? "pointer"
                          : "not-allowed",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      minWidth: 90,
                      justifyContent: "center",
                    }}
                  >
                    {isVerifying ? (
                      <>
                        <div
                          style={{
                            width: 10,
                            height: 10,
                            border: "2px solid #525252",
                            borderTopColor: "transparent",
                            borderRadius: "50%",
                            animation: "spin 1s linear infinite",
                          }}
                        />
                        verifying...
                      </>
                    ) : (
                      "connect"
                    )}
                  </button>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: "#525252" }}>
                  Lấy token tại{" "}
                  <a
                    href="https://vercel.com/account/tokens"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#737373", textDecoration: "underline" }}
                  >
                    vercel.com/account/tokens
                  </a>
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div
                  style={{
                    padding: "12px",
                    background: "#0c0c0c",
                    border: "1px solid #1f1f1f",
                    borderRadius: 4,
                    fontSize: 12,
                    color: "#a3a3a3",
                  }}
                >
                  Vercel token đã được lưu trong cookie. Token này sẽ được dùng
                  làm fallback khi .env token không có.
                </div>
                <button
                  onClick={handleDisconnect}
                  style={{
                    padding: "8px 16px",
                    background: "transparent",
                    border: "1px solid #2a2a2a",
                    color: "#ef4444",
                    fontSize: 11,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    borderRadius: 4,
                    alignSelf: "flex-start",
                  }}
                >
                  xóa cookie
                </button>
              </div>
            )}
            {/* Sync result badge */}
            {syncResult && (
              <div
                style={{
                  marginTop: 12,
                  fontSize: 12,
                  color: "#22c55e",
                  fontFamily: "monospace",
                }}
              >
                ✓ last_sync: {syncResult.added} added / {syncResult.total} total
              </div>
            )}
          </div>

          {/* Health Check Settings */}
          <div
            style={{
              padding: "20px",
              background: "#171717",
              border: "1px solid #1f1f1f",
              marginBottom: 24,
            }}
          >
            <h3
              style={{
                margin: "0 0 16px 0",
                color: "#e5e5e5",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              health_check
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  defaultChecked
                  style={{ width: 16, height: 16, accentColor: "#22c55e" }}
                />
                <span style={{ color: "#e5e5e5", fontSize: 13 }}>
                  auto_check_interval
                </span>
                <span
                  style={{ color: "#737373", fontSize: 12, marginLeft: "auto" }}
                >
                  every 5 min
                </span>
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  defaultChecked
                  style={{ width: 16, height: 16, accentColor: "#22c55e" }}
                />
                <span style={{ color: "#e5e5e5", fontSize: 13 }}>
                  notify_on_status_change
                </span>
                <span
                  style={{ color: "#737373", fontSize: 12, marginLeft: "auto" }}
                >
                  desktop
                </span>
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: "#e5e5e5", fontSize: 13 }}>timeout</span>
                <input
                  type="number"
                  defaultValue={5000}
                  style={{
                    width: 80,
                    padding: "6px 8px",
                    background: "#0c0c0c",
                    border: "1px solid #1f1f1f",
                    color: "#e5e5e5",
                    fontSize: 13,
                    fontFamily: "inherit",
                  }}
                />
                <span style={{ color: "#737373", fontSize: 12 }}>ms</span>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div
            style={{
              padding: "20px",
              background: "#171717",
              border: "1px solid #1f1f1f",
              marginBottom: 24,
            }}
          >
            <h3
              style={{
                margin: "0 0 16px 0",
                color: "#e5e5e5",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              appearance
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  defaultChecked
                  style={{ width: 16, height: 16, accentColor: "#22c55e" }}
                />
                <span style={{ color: "#e5e5e5", fontSize: 13 }}>
                  dark_mode
                </span>
                <span
                  style={{ color: "#737373", fontSize: 12, marginLeft: "auto" }}
                >
                  system
                </span>
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                }}
              >
                <span style={{ color: "#e5e5e5", fontSize: 13 }}>
                  accent_color
                </span>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginLeft: "auto",
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      background: "#22c55e",
                      borderRadius: "50%",
                      border: "2px solid #e5e5e5",
                      cursor: "pointer",
                    }}
                  />
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      background: "#3b82f6",
                      borderRadius: "50%",
                      border: "2px solid transparent",
                      cursor: "pointer",
                    }}
                  />
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      background: "#f59e0b",
                      borderRadius: "50%",
                      border: "2px solid transparent",
                      cursor: "pointer",
                    }}
                  />
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      background: "#ef4444",
                      borderRadius: "50%",
                      border: "2px solid transparent",
                      cursor: "pointer",
                    }}
                  />
                </div>
              </label>
            </div>
          </div>

          {/* About */}
          <div
            style={{
              padding: "20px",
              background: "#171717",
              border: "1px solid #1f1f1f",
            }}
          >
            <h3
              style={{
                margin: "0 0 16px 0",
                color: "#e5e5e5",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              about
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#737373", fontSize: 12 }}>version</span>
                <span style={{ color: "#e5e5e5", fontSize: 12 }}>1.0.0</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#737373", fontSize: 12 }}>build</span>
                <span style={{ color: "#e5e5e5", fontSize: 12 }}>
                  2025.03.19
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#737373", fontSize: 12 }}>
                  framework
                </span>
                <span style={{ color: "#e5e5e5", fontSize: 12 }}>
                  Next.js 16
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ─── Toast container ──────────────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          zIndex: 9999,
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              padding: "12px 16px",
              background:
                t.type === "success"
                  ? "#052e16"
                  : t.type === "error"
                  ? "#450a0a"
                  : "#1a1a1a",
              border: `1px solid ${
                t.type === "success"
                  ? "#22c55e"
                  : t.type === "error"
                  ? "#ef4444"
                  : "#404040"
              }`,
              color:
                t.type === "success"
                  ? "#22c55e"
                  : t.type === "error"
                  ? "#ef4444"
                  : "#e5e5e5",
              fontSize: 13,
              borderRadius: 4,
              fontFamily: "monospace",
              maxWidth: 320,
              lineHeight: 1.4,
              animation: "fadeIn 0.2s ease",
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </>
  );
}
