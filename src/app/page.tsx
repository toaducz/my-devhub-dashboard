"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Sidebar from "@/components/layout/sidebar";
import StatsRow from "@/components/layout/stats-row";
import FilterTags from "@/components/projects/filter-tags";
import ProjectCard from "@/components/projects/project-card";
import AddProjectModal from "@/components/projects/add-project-modal";
import EditProjectModal from "@/components/projects/edit-project-modal";
import {
  fetchProjects,
  subscribeToProjects,
  type DbProject,
} from "@/lib/project-repository";
import type { Project, ProjectPlatform } from "@/types/project";
import { vercelAPI, type VercelProject } from "@/lib/vercel-api";
import { useAuth } from "@/lib/contexts";

type CategoryFilter = "active" | "learning" | "research" | "archive" | null;
type SortBy = "name" | "createdAt";
type SortOrder = "asc" | "desc";

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>(null);
  const [activeTag, setActiveTag] = useState<string>("all");
  const [privacyFilter, setPrivacyFilter] = useState<
    "all" | "public" | "private"
  >("all");
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [projects, setProjects] = useState<Project[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isVercelConnected, setIsVercelConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasEnvToken, setHasEnvToken] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  // Filter out private projects for guests
  const visibleProjects = useMemo(() => {
    if (user) return projects; // Logged in users see all projects by default (will apply privacyFilter later)
    return projects.filter((p) => !p.isPrivate); // Guests only see public projects
  }, [projects, user]);

  // Filter projects based on category, tag, and privacy (applied to visible projects)
  const filteredProjects = useMemo(() => {
    const base = user ? projects : visibleProjects; // When logged in, start with all projects to apply privacy filter

    const filtered = base.filter((project: Project) => {
      // Category filter
      if (activeCategory && project.category !== activeCategory) {
        return false;
      }

      // Tag filter
      if (activeTag !== "all") {
        const inPlatforms = project.platforms.some(
          (p: ProjectPlatform) => p === activeTag
        );
        const inTechStack = project.techStack.includes(activeTag);
        if (!inPlatforms && !inTechStack) {
          return false;
        }
      }

      // Privacy filter (only for logged in users)
      if (user && privacyFilter !== "all") {
        if (privacyFilter === "private" && !project.isPrivate) return false;
        if (privacyFilter === "public" && project.isPrivate) return false;
      }

      // Search filter
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesName = project.name.toLowerCase().includes(query);
        const matchesDescription = project.description
          .toLowerCase()
          .includes(query);
        const matchesTechStack = project.techStack.some((tech: string) =>
          tech.toLowerCase().includes(query)
        );
        const matchesPlatforms = project.platforms.some(
          (platform: ProjectPlatform) => platform.toLowerCase().includes(query)
        );
        if (
          !matchesName &&
          !matchesDescription &&
          !matchesTechStack &&
          !matchesPlatforms
        ) {
          return false;
        }
      }

      return true;
    });

    // Sort
    return [...filtered].sort((a, b) => {
      if (sortBy === "name") {
        const cmp = a.name.localeCompare(b.name, undefined, {
          sensitivity: "base",
        });
        return sortOrder === "asc" ? cmp : -cmp;
      }
      // createdAt — sort by id lexicographic (UUID v4 time-ordered from Supabase)
      const cmp = a.id.localeCompare(b.id);
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [
    projects,
    visibleProjects,
    user,
    activeCategory,
    activeTag,
    privacyFilter,
    searchQuery,
    sortBy,
    sortOrder,
  ]);

  const getTitle = () => {
    if (activeCategory) {
      return activeCategory;
    }
    if (activeTag !== "all") {
      return `tag: ${activeTag}`;
    }
    return "all_projects";
  };

  const handleCategoryChange = (category: string | null) => {
    setActiveCategory(category as CategoryFilter);
    setActiveTag("all"); // Reset tag filter when category changes
  };

  const handleTagChange = (tag: string) => {
    setActiveTag(tag);
    setActiveCategory(null); // Reset category filter when tag changes
  };

  const handlePrivacyFilterChange = (filter: "all" | "public" | "private") => {
    setPrivacyFilter(filter);
  };

  const handleAddProject = (newProject: Project) => {
    setProjects((prev) => [newProject, ...prev]);
  };

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === updatedProject.id ? updatedProject : p))
    );
  };

  // Fetch projects from Supabase on mount
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setIsLoading(true);
        const data = await fetchProjects();
        setProjects(data);
      } catch (error) {
        console.error("Failed to load projects:", error);
        setSyncError(
          error instanceof Error ? error.message : "Failed to load projects"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToProjects((payload) => {
      if (!payload) return;

      const { eventType, new: newProject, old: oldProject } = payload;

      if (eventType === "INSERT" && newProject) {
        const transformed = transformDbProject(newProject);
        setProjects((prev) => [transformed, ...prev]);
      } else if (eventType === "UPDATE" && newProject) {
        const transformed = transformDbProject(newProject);
        setProjects((prev) =>
          prev.map((p) => (p.id === transformed.id ? transformed : p))
        );
      } else if (eventType === "DELETE" && oldProject) {
        setProjects((prev) => prev.filter((p) => p.id !== oldProject.id));
      }
    });

    return () => {
      unsubscribe.unsubscribe();
    };
  }, []);

  // Helper function to transform DbProject to Project
  function transformDbProject(dbProject: DbProject): Project {
    return {
      id: dbProject.id,
      name: dbProject.name,
      description: dbProject.description || "",
      status: dbProject.status,
      platforms: dbProject.platforms,
      isLive: dbProject.is_live,
      techStack: dbProject.tech_stack,
      url: dbProject.url,
      category: dbProject.category,
      isPrivate: dbProject.is_private,
      isVercelSynced: !!dbProject.vercel_project_id,
      vercel_project_id: dbProject.vercel_project_id || undefined,
      health: dbProject.last_health_check
        ? {
            lastPing: new Date(dbProject.last_health_check),
            status: dbProject.health_status || "unknown",
          }
        : undefined,
    };
  }

  // Check for Vercel token availability (env or cookie)
  useEffect(() => {
    const checkVercelToken = async () => {
      try {
        const res = await fetch("/api/vercel/check-token");
        const json = (await res.json()) as { hasToken: boolean };
        setHasEnvToken(json.hasToken);
      } catch {
        setHasEnvToken(false);
      }
    };
    checkVercelToken();
  }, []);

  // Set Vercel connection status based on token availability
  useEffect(() => {
    const hasCookieToken = vercelAPI.hasToken();
    const hasToken = hasEnvToken || hasCookieToken;
    setIsVercelConnected(hasToken);
  }, [hasEnvToken]);

  const syncVercelProjects = useCallback(async () => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      // Use the API route which handles token priority: .env -> cookie -> header
      const res = await fetch("/api/vercel");
      const responseBody = await res.json();

      if (!res.ok) {
        throw new Error(
          responseBody.error || "Failed to fetch Vercel projects"
        );
      }

      const { data: vercelProjects, warnings } = responseBody as {
        data: VercelProject[];
        warnings?: string[];
      };

      // Log warnings if any
      if (warnings && warnings.length > 0) {
        console.warn("[syncVercelProjects] API warnings:", warnings);
        setSyncError(
          `Synced with ${warnings.length} issue(s). Check console for details.`
        );
      }

      console.log(
        "[syncVercelProjects] Received",
        vercelProjects.length,
        "projects from Vercel"
      );

      // Save Vercel projects to database via API
      const saveRes = await fetch("/api/projects/vercel-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projects: vercelProjects }),
      });

      if (!saveRes.ok) {
        const saveError = await saveRes.json();
        throw new Error(
          saveError.error || "Failed to save Vercel projects to database"
        );
      }

      // Refetch all projects from database (includes custom + newly synced)
      const data = await fetchProjects();
      setProjects(data);
      setLastSyncTime(new Date());
    } catch (error) {
      console.error("Failed to sync Vercel projects:", error);
      setSyncError(
        error instanceof Error
          ? error.message
          : "Failed to sync Vercel projects"
      );
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Compute category counts based on visible projects
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    visibleProjects.forEach((project) => {
      counts.set(project.category, (counts.get(project.category) || 0) + 1);
    });
    return [
      { key: "all", label: "all", count: visibleProjects.length },
      { key: "active", label: "active", count: counts.get("active") || 0 },
      {
        key: "learning",
        label: "learning",
        count: counts.get("learning") || 0,
      },
      {
        key: "research",
        label: "research",
        count: counts.get("research") || 0,
      },
      { key: "archive", label: "archive", count: counts.get("archive") || 0 },
    ];
  }, [visibleProjects]);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "#0c0c0c",
        position: "relative",
      }}
    >
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="mobile-menu-toggle"
        style={{
          position: "fixed",
          top: 16,
          left: 16,
          zIndex: 1001,
          padding: "8px 12px",
          background: "#171717",
          border: "1px solid #1f1f1f",
          color: "#e5e5e5",
          cursor: "pointer",
          borderRadius: 4,
          display: "none",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {isMobileMenuOpen ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>

      {/* Mobile Sidebar Drawer */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: 240,
          background: "#0c0c0c",
          borderRight: "1px solid #1f1f1f",
          transform: isMobileMenuOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s ease",
          zIndex: 1000,
          display: "none",
        }}
        className="mobile-sidebar-drawer"
      >
        <Sidebar
          onCategoryChange={(cat) => {
            handleCategoryChange(cat);
            setIsMobileMenuOpen(false);
          }}
          activeCategory={activeCategory}
          categories={categoryCounts}
        />
      </div>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            zIndex: 999,
          }}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <div className="desktop-sidebar">
        <Sidebar
          onCategoryChange={handleCategoryChange}
          activeCategory={activeCategory}
          categories={categoryCounts}
        />
      </div>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 24,
          overflowY: "auto",
          minWidth: 0,
        }}
        className="main-content"
      >
        {/* Header */}
        <div
          className="header-container"
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          {/* Title */}
          <div
            className="header-title"
            style={{ display: "flex", flexDirection: "column", gap: 4 }}
          >
            <h1
              style={{
                margin: 0,
                color: "#e5e5e5",
                fontSize: 24,
                fontWeight: 600,
                fontFamily: "inherit",
              }}
            >
              {getTitle()}
            </h1>
            <p
              style={{
                margin: 0,
                color: "#525252",
                fontSize: 12,
              }}
            >
              {isLoading
                ? "loading..."
                : `${filteredProjects.length} of ${projects.length} projects •`}
              {!isLoading && (
                <span
                  style={{ color: isVercelConnected ? "#22c55e" : "#737373" }}
                >
                  {" "}
                  {isVercelConnected ? "vercel: connected" : "vercel: offline"}
                </span>
              )}
              {lastSyncTime && !isLoading && (
                <span>
                  {" "}
                  • last_sync:{" "}
                  {`${Math.floor(
                    (Date.now() - lastSyncTime.getTime()) / 60000
                  )} min ago`}
                </span>
              )}
              {syncError && (
                <span style={{ color: "#ef4444", marginLeft: 8 }}>
                  • {syncError}
                </span>
              )}
            </p>
          </div>

          {/* Actions */}
          <div
            className="header-actions"
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            {/* Privacy Filter - only show when logged in */}
            {user && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  background: "#171717",
                  border: "1px solid #1f1f1f",
                }}
              >
                <span style={{ color: "#525252", fontSize: 12 }}>privacy:</span>
                {(["all", "public", "private"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => handlePrivacyFilterChange(filter)}
                    style={{
                      padding: "4px 10px",
                      background:
                        privacyFilter === filter ? "#22c55e" : "#1a1a1a",
                      border:
                        privacyFilter === filter ? "none" : "1px solid #252525",
                      color: privacyFilter === filter ? "#0c0c0c" : "#737373",
                      fontSize: 11,
                      fontWeight: privacyFilter === filter ? 600 : 400,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {filter === "all" ? "all" : filter}
                  </button>
                ))}
              </div>
            )}

            {/* Sort */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                background: "#171717",
                border: "1px solid #1f1f1f",
              }}
            >
              <span style={{ color: "#525252", fontSize: 12 }}>sort:</span>
              {(["name", "createdAt"] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setSortBy(key)}
                  style={{
                    padding: "4px 10px",
                    background: sortBy === key ? "#3b82f6" : "#1a1a1a",
                    border: sortBy === key ? "none" : "1px solid #252525",
                    color: sortBy === key ? "#fff" : "#737373",
                    fontSize: 11,
                    fontWeight: sortBy === key ? 600 : 400,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {key === "name" ? "name" : "date"}
                </button>
              ))}
              <button
                onClick={() =>
                  setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
                }
                title={sortOrder === "asc" ? "Ascending" : "Descending"}
                style={{
                  padding: "4px 8px",
                  background: "#1a1a1a",
                  border: "1px solid #252525",
                  color: "#737373",
                  fontSize: 11,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </button>
            </div>

            {/* Search */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                background: "#171717",
                border: "1px solid #1f1f1f",
                minWidth: "200px",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#525252"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#525252",
                  fontSize: 12,
                  fontFamily: "inherit",
                  width: "100%",
                  minWidth: 0,
                }}
              />
            </div>

            {/* Sync Vercel - only show if connected AND logged in */}
            {isVercelConnected && user && (
              <button
                onClick={syncVercelProjects}
                disabled={isSyncing}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px",
                  background: isSyncing ? "#1a1a1a" : "#171717",
                  border: "1px solid #1f1f1f",
                  color: isSyncing ? "#525252" : "#22c55e",
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: "inherit",
                  cursor: isSyncing ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                  opacity: isSyncing ? 0.7 : 1,
                }}
              >
                {isSyncing ? (
                  <>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        border: "2px solid #525252",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    />
                    syncing...
                  </>
                ) : (
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                      <path d="M8 16H3v5" />
                    </svg>
                    sync_vercel
                  </>
                )}
              </button>
            )}

            {/* Add Project — chỉ hiện khi đã đăng nhập */}
            {user && (
              <button
                onClick={() => setIsModalOpen(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px",
                  background: "#22c55e",
                  border: "none",
                  color: "#0c0c0c",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  transition: "opacity 0.15s",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0c0c0c"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                add_project
              </button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <StatsRow projects={visibleProjects} />

        {/* Filter Tags */}
        <FilterTags
          onTagChange={handleTagChange}
          activeTag={activeTag}
          projects={visibleProjects}
        />

        {/* Project Cards Grid */}
        <div
          className="project-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
        >
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={user ? setEditingProject : undefined}
            />
          ))}
        </div>

        {!isLoading && filteredProjects.length === 0 && (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "#525252",
              fontSize: 14,
            }}
          >
            no_projects_found
          </div>
        )}
      </main>

      {user && isModalOpen && (
        <AddProjectModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAdd={handleAddProject}
        />
      )}

      {user && editingProject && (
        <EditProjectModal
          isOpen={true}
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onUpdate={handleUpdateProject}
        />
      )}
    </div>
  );
}
