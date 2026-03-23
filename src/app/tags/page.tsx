"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts";
import { fetchProjects } from "@/lib/project-repository";
import type { Project } from "@/types/project";

interface Tag {
  id: string;
  name: string;
  count: number;
  type: "system" | "custom";
  color?: string;
}

const TAG_COLORS: Record<string, string> = {
  Vercel: "#22c55e",
  NextJS: "#000000",
  Go: "#00add8",
  NestJS: "#e0234e",
  Docker: "#2496ed",
  Rust: "#ce422b",
  VPS: "#f59e0b",
  GitHub: "#a3a3a3",
};

const getTagColor = (name: string): string => {
  return TAG_COLORS[name] || "#525252";
};

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect_to=/tags");
    }
  }, [user, loading, router]);

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

  // Extract tags from projects
  const computedTags = useMemo(() => {
    const tagMap = new Map<string, Tag>();

    // Add system tags
    const systemTags = [
      "Vercel",
      "NextJS",
      "Go",
      "NestJS",
      "Docker",
      "Rust",
      "VPS",
      "GitHub",
    ];
    systemTags.forEach((name) => {
      tagMap.set(name.toLowerCase(), {
        id: name.toLowerCase(),
        name,
        count: 0,
        type: "system",
        color: getTagColor(name),
      });
    });

    // Count tags from projects
    projects.forEach((project) => {
      // Platform tags
      project.platforms.forEach((platform) => {
        const key = platform.toLowerCase();
        if (tagMap.has(key)) {
          tagMap.get(key)!.count++;
        } else {
          tagMap.set(key, {
            id: key,
            name: platform,
            count: 1,
            type: "system",
            color: getTagColor(platform),
          });
        }
      });

      // Tech stack tags
      project.techStack.forEach((tech) => {
        const key = tech.toLowerCase();
        if (tagMap.has(key)) {
          tagMap.get(key)!.count++;
        } else {
          tagMap.set(key, {
            id: key,
            name: tech,
            count: 1,
            type: "custom",
          });
        }
      });
    });

    return Array.from(tagMap.values()).sort((a, b) => b.count - a.count);
  }, [projects]);

  // Sync computed tags to state only when they change
  useEffect(() => {
    setTags(computedTags);
  }, [computedTags]);

  const handleAddTag = () => {
    if (!newTagName.trim()) return;

    const key = newTagName.toLowerCase();
    if (tags.find((t) => t.id === key)) {
      alert(`Tag "${newTagName}" already exists`);
      return;
    }

    const newTag: Tag = {
      id: key,
      name: newTagName,
      count: 0,
      type: "custom",
      color: newTagColor,
    };

    setTags([...tags, newTag]);
    setNewTagName("");
    setNewTagColor("#3b82f6");
  };

  const handleDeleteTag = (tagId: string) => {
    const tag = tags.find((t) => t.id === tagId);
    if (tag?.type === "system") {
      alert("Cannot delete system tags");
      return;
    }
    setTags(tags.filter((t) => t.id !== tagId));
  };

  const categories = [
    { key: "all", label: "all", count: projects.length },
    { key: "active", label: "active", count: 0 },
    { key: "learning", label: "learning", count: 0 },
    { key: "research", label: "research", count: 0 },
    { key: "archive", label: "archive", count: 0 },
  ];

  // Show loading state
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#0c0c0c",
          color: "#e5e5e5",
        }}
      >
        loading...
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    return null;
  }

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
          {categories.map((cat) => (
            <button
              key={cat.key}
              className="flex items-center justify-between w-full transition-colors"
              style={{
                padding: "6px 12px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <span style={{ color: "#737373", fontSize: 12 }}>
                {cat.label}
              </span>
              <span style={{ color: "#525252", fontSize: 11 }}>
                {isLoading ? "..." : cat.count}
              </span>
            </button>
          ))}
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
              tags
            </h1>
            <p
              style={{
                margin: 0,
                color: "#525252",
                fontSize: 12,
                marginTop: 4,
              }}
            >
              manage project tags and smart categorization
            </p>
          </div>
        </div>

        {/* Add new tag */}
        <div
          style={{
            display: "flex",
            gap: 12,
            padding: "16px",
            background: "#171717",
            border: "1px solid #1f1f1f",
            marginBottom: 24,
            alignItems: "flex-end",
          }}
        >
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: "block",
                color: "#737373",
                fontSize: 11,
                marginBottom: 8,
              }}
            >
              tag_name
            </label>
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Enter tag name..."
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "#0c0c0c",
                border: "1px solid #1f1f1f",
                color: "#e5e5e5",
                fontSize: 13,
                fontFamily: "inherit",
                outline: "none",
              }}
            />
          </div>
          <div style={{ width: 120 }}>
            <label
              style={{
                display: "block",
                color: "#737373",
                fontSize: 11,
                marginBottom: 8,
              }}
            >
              color
            </label>
            <input
              type="color"
              value={newTagColor}
              onChange={(e) => setNewTagColor(e.target.value)}
              style={{
                width: "100%",
                height: "36px",
                padding: 0,
                border: "1px solid #1f1f1f",
                background: "#0c0c0c",
                cursor: "pointer",
              }}
            />
          </div>
          <button
            onClick={handleAddTag}
            disabled={!newTagName.trim()}
            style={{
              padding: "8px 16px",
              background: newTagName.trim() ? "#22c55e" : "#171717",
              border: "none",
              color: newTagName.trim() ? "#0c0c0c" : "#525252",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: newTagName.trim() ? "pointer" : "not-allowed",
              height: 36,
            }}
          >
            add_tag
          </button>
        </div>

        {/* Tags grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
        >
          {tags.map((tag) => (
            <div
              key={tag.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                background: "#171717",
                border: `1px solid ${tag.color || "#1f1f1f"}`,
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: tag.color || "#525252",
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
                  {tag.name}
                </p>
                <p style={{ margin: 0, color: "#737373", fontSize: 11 }}>
                  {tag.count} project{tag.count !== 1 ? "s" : ""} • {tag.type}
                </p>
              </div>
              {tag.type === "custom" && (
                <button
                  onClick={() => handleDeleteTag(tag.id)}
                  style={{
                    padding: "4px 8px",
                    background: "transparent",
                    border: "1px solid #ef4444",
                    color: "#ef4444",
                    fontSize: 10,
                    cursor: "pointer",
                  }}
                >
                  delete
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Smart Tagging Info */}
        <div
          style={{
            marginTop: 32,
            padding: "16px",
            background: "#171717",
            border: "1px solid #1f1f1f",
          }}
        >
          <h3
            style={{
              margin: "0 0 12px 0",
              color: "#e5e5e5",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            smart_tagging
          </h3>
          <p
            style={{
              margin: 0,
              color: "#737373",
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            Tags are automatically extracted from project platforms and tech
            stack. System tags (Vercel, NextJS, Go, etc.) cannot be deleted.
            Custom tags can be added manually and will be available for
            filtering.
          </p>
        </div>
      </main>
    </div>
  );
}
