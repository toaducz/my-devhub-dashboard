"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { fetchProjects } from "@/lib/project-repository";
import type { Project } from "@/types/project";

type HealthStatus = "healthy" | "unhealthy" | "checking" | "unknown";

interface ProjectHealth {
  projectId: string;
  status: HealthStatus;
  responseTime?: number;
  lastChecked: Date | null;
  error?: string;
}

export default function HealthPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [healthData, setHealthData] = useState<Map<string, ProjectHealth>>(
    new Map()
  );
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  // Fetch projects from Supabase
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await fetchProjects();
        setProjects(data);
      } catch (error) {
        console.error("Failed to load projects:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadProjects();
  }, []);

  // Check health of a single project via API
  const toggleProjectLive = useCallback(
    async (projectId: string, currentIsLive: boolean) => {
      try {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isLive: !currentIsLive }),
        });
        if (!res.ok) {
          console.error("Failed to toggle project live status");
          return;
        }
        // Update local state
        setProjects((prev) =>
          prev.map((p) =>
            p.id === projectId ? { ...p, isLive: !currentIsLive } : p
          )
        );
        // If we're marking as not live, remove from healthData
        if (currentIsLive) {
          setHealthData((prev) => {
            const next = new Map(prev);
            next.delete(projectId);
            return next;
          });
        }
      } catch (error) {
        console.error("Failed to toggle project live status:", error);
      }
    },
    []
  );

  const checkProjectHealth = useCallback(
    async (projectId: string): Promise<ProjectHealth> => {
      try {
        const res = await fetch(`/api/health/${projectId}`);
        if (!res.ok) {
          return {
            projectId,
            status: "unknown",
            lastChecked: new Date(),
            error: "Failed to check health",
          };
        }
        const result = await res.json();
        return {
          projectId,
          status: result.status,
          responseTime: result.responseTime,
          lastChecked: new Date(result.checkedAt),
          error: result.error,
        };
      } catch (error) {
        return {
          projectId,
          status: "unknown",
          lastChecked: new Date(),
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    []
  );

  const checkAllProjects = useCallback(async () => {
    setIsCheckingAll(true);

    // Check all projects in parallel
    const checks = projects.map((project) =>
      checkProjectHealth(project.id)
    );
    const results = await Promise.all(checks);

    // Update health data
    const newHealthData = new Map<string, ProjectHealth>();
    results.forEach((health) => {
      newHealthData.set(health.projectId, health);
    });

    setHealthData(newHealthData);
    setIsCheckingAll(false);
  }, [projects, checkProjectHealth]);

  const checkSingleProject = useCallback(
    async (projectId: string) => {
      const health = await checkProjectHealth(projectId);
      setHealthData((prev) => new Map(prev.set(projectId, health)));
    },
    [checkProjectHealth]
  );


  const getStatusColor = (status: HealthStatus) => {
    switch (status) {
      case "healthy":
        return "#22c55e";
      case "unhealthy":
        return "#ef4444";
      case "checking":
        return "#f59e0b";
      default:
        return "#525252";
    }
  };

  const getStatusLabel = (status: HealthStatus) => {
    switch (status) {
      case "healthy":
        return "healthy";
      case "unhealthy":
        return "offline";
      case "checking":
        return "checking...";
      default:
        return "unknown";
    }
  };


  return (
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
              background: pathname === "/settings" ? "#1a1a1a" : "transparent",
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
              {isLoading ? "..." : projects.length}
            </span>
          </button>
        </div>

        <div className="flex-1" />

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#22c55e",
                flexShrink: 0,
              }}
            />
            <span style={{ color: "#a3a3a3", fontSize: 12 }}>toaducz</span>
          </div>
          <span style={{ color: "#525252", fontSize: 11, paddingLeft: 16 }}>
            admin
          </span>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: "32px 40px", overflowY: "auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                color: "#e5e5e5",
                fontSize: 24,
                fontWeight: 600,
                fontFamily: "inherit",
              }}
            >
              health_check
            </h1>
            <p
              style={{
                margin: 0,
                color: "#525252",
                fontSize: 12,
                marginTop: 4,
              }}
            >
              monitor project availability and response times
            </p>
          </div>

          <button
            onClick={checkAllProjects}
            disabled={isCheckingAll}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              background: isCheckingAll ? "#171717" : "#22c55e",
              border: "none",
              color: isCheckingAll ? "#525252" : "#0c0c0c",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: isCheckingAll ? "not-allowed" : "pointer",
              transition: "all 0.15s",
            }}
          >
            {isCheckingAll ? (
              <>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    border: "2px solid #525252",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
                checking...
              </>
            ) : (
              <>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0c0c0c"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                  <path d="M8 16H3v5" />
                </svg>
                check_all
              </>
            )}
          </button>
        </div>

        {/* Health Summary */}
        <div className="flex gap-3 w-full" style={{ marginBottom: 24 }}>
          <div
            style={{
              flex: 1,
              padding: "12px 16px",
              background: "#171717",
              border: "1px solid #1f1f1f",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#22c55e",
                flexShrink: 0,
              }}
            />
            <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 500 }}>
              {
                Array.from(healthData.values()).filter(
                  (h) => h.status === "healthy"
                ).length
              }{" "}
              healthy
            </span>
          </div>
          <div
            style={{
              flex: 1,
              padding: "12px 16px",
              background: "#171717",
              border: "1px solid #1f1f1f",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#ef4444",
                flexShrink: 0,
              }}
            />
            <span style={{ color: "#ef4444", fontSize: 13, fontWeight: 500 }}>
              {
                Array.from(healthData.values()).filter(
                  (h) => h.status === "unhealthy"
                ).length
              }{" "}
              offline
            </span>
          </div>
          <div
            style={{
              flex: 1,
              padding: "12px 16px",
              background: "#171717",
              border: "1px solid #1f1f1f",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#525252",
                flexShrink: 0,
              }}
            />
            <span style={{ color: "#525252", fontSize: 13, fontWeight: 500 }}>
              {projects.length -
                Array.from(healthData.values()).filter(
                  (h) => h.status === "healthy" || h.status === "unhealthy"
                ).length}{" "}
              unchecked
            </span>
          </div>
        </div>

        {/* Health List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {projects.map((project) => {
            const health = healthData.get(project.id);
            const status = health?.status || "unknown";
            const color = getStatusColor(status);

            return (
              <div
                key={project.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "12px 16px",
                  background: "#171717",
                  border: `1px solid ${color}`,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: color,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      margin: 0,
                      color: "#e5e5e5",
                      fontSize: 14,
                      fontWeight: 500,
                    }}
                  >
                    {project.name}
                  </p>
                  <p style={{ margin: 0, color: "#737373", fontSize: 11 }}>
                    {project.url}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p
                    style={{ margin: 0, color, fontSize: 13, fontWeight: 600 }}
                  >
                    {getStatusLabel(status)}
                  </p>
                  {health?.responseTime && (
                    <p style={{ margin: 0, color: "#525252", fontSize: 11 }}>
                      {health.responseTime}ms
                    </p>
                  )}
                  {health?.lastChecked && (
                    <p style={{ margin: 0, color: "#525252", fontSize: 10 }}>
                      {health.lastChecked.toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() =>
                      toggleProjectLive(project.id, project.isLive)
                    }
                    title={project.isLive ? "Mark as not live" : "Mark as live"}
                    style={{
                      padding: "4px 12px",
                      background: "#1a1a1a",
                      border: "1px solid #252525",
                      color: project.isLive ? "#22c55e" : "#525252",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    {project.isLive ? "● live" : "○ not_live"}
                  </button>
                  <button
                    onClick={() => checkSingleProject(project.id)}
                    disabled={status === "checking"}
                    style={{
                      padding: "4px 12px",
                      background: status === "checking" ? "#171717" : "#1a1a1a",
                      border: "1px solid #252525",
                      color: status === "checking" ? "#525252" : "#737373",
                      fontSize: 11,
                      cursor: status === "checking" ? "not-allowed" : "pointer",
                    }}
                  >
                    {status === "checking" ? "..." : "recheck"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
