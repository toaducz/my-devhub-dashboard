"use client";

import { useState } from "react";
import {
  createProject,
  transformProjectInsert,
} from "@/lib/project-repository";
import type { Project, ProjectPlatform } from "@/types/project";

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (project: Project) => void;
}

type CategoryType = "active" | "learning" | "research" | "archive";

export default function AddProjectModal({
  isOpen,
  onClose,
  onAdd,
}: AddProjectModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    url: "",
    category: "active" as CategoryType,
    platforms: [] as ProjectPlatform[],
    techStack: [] as string[],
    isLive: false,
    isPrivate: false,
  });

  const [newTechStack, setNewTechStack] = useState("");
  const [newPlatform, setNewPlatform] = useState<ProjectPlatform>("Vercel");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Ensure URL has https:// prefix
    let url = formData.url.trim();
    if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    try {
      const projectData = transformProjectInsert({
        name: formData.name,
        description: formData.description,
        url: url,
        category: formData.category,
        platforms: formData.platforms,
        techStack: formData.techStack,
        isLive: formData.isLive,
        isPrivate: formData.isPrivate,
      });

      const savedProject = await createProject(projectData);

      onAdd(savedProject);
      resetForm();
      onClose();
    } catch (error) {
      console.error("Failed to create project:", error);
      alert("Failed to create project. Please try again.");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      url: "",
      category: "active",
      platforms: [],
      techStack: [],
      isLive: false,
      isPrivate: false,
    });
    setNewTechStack("");
    setNewPlatform("Vercel");
  };

  const togglePlatform = (platform: ProjectPlatform) => {
    setFormData((prev) => {
      const includes = prev.platforms.includes(platform);
      return {
        ...prev,
        platforms: includes
          ? prev.platforms.filter((p) => p !== platform)
          : [...prev.platforms, platform],
      };
    });
  };

  const addTechStack = () => {
    const tech = newTechStack.trim();
    if (tech && !formData.techStack.includes(tech)) {
      setFormData((prev) => ({
        ...prev,
        techStack: [...prev.techStack, tech],
      }));
      setNewTechStack("");
    }
  };

  const removeTechStack = (tech: string) => {
    setFormData((prev) => ({
      ...prev,
      techStack: prev.techStack.filter((t) => t !== tech),
    }));
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        style={{
          background: "#171717",
          border: "1px solid #1f1f1f",
          borderRadius: 8,
          width: "100%",
          maxWidth: 500,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid #1f1f1f",
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "#e5e5e5",
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            add_project
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#525252",
              cursor: "pointer",
              fontSize: 20,
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Name */}
            <div>
              <label
                style={{
                  color: "#e5e5e5",
                  fontSize: 12,
                  marginBottom: 4,
                  display: "block",
                }}
              >
                project_name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#0c0c0c",
                  border: "1px solid #1f1f1f",
                  color: "#e5e5e5",
                  fontSize: 14,
                  fontFamily: "inherit",
                  borderRadius: 4,
                }}
                placeholder="my-awesome-project"
              />
            </div>

            {/* Description */}
            <div>
              <label
                style={{
                  color: "#e5e5e5",
                  fontSize: 12,
                  marginBottom: 4,
                  display: "block",
                }}
              >
                description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#0c0c0c",
                  border: "1px solid #1f1f1f",
                  color: "#e5e5e5",
                  fontSize: 14,
                  fontFamily: "inherit",
                  borderRadius: 4,
                  minHeight: 60,
                  resize: "vertical",
                }}
                placeholder="// Brief description of your project"
              />
            </div>

            {/* URL */}
            <div>
              <label
                style={{
                  color: "#e5e5e5",
                  fontSize: 12,
                  marginBottom: 4,
                  display: "block",
                }}
              >
                url *
              </label>
              <input
                type="url"
                required
                value={formData.url}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, url: e.target.value }))
                }
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#0c0c0c",
                  border: "1px solid #1f1f1f",
                  color: "#e5e5e5",
                  fontSize: 14,
                  fontFamily: "inherit",
                  borderRadius: 4,
                }}
                placeholder="myproject.com"
              />
            </div>

            {/* Category */}
            <div>
              <label
                style={{
                  color: "#e5e5e5",
                  fontSize: 12,
                  marginBottom: 4,
                  display: "block",
                }}
              >
                category
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    category: e.target.value as CategoryType,
                  }))
                }
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#0c0c0c",
                  border: "1px solid #1f1f1f",
                  color: "#e5e5e5",
                  fontSize: 14,
                  fontFamily: "inherit",
                  borderRadius: 4,
                }}
              >
                <option value="active">active</option>
                <option value="learning">learning</option>
                <option value="research">research</option>
                <option value="archive">archive</option>
              </select>
            </div>

            {/* Platforms */}
            <div>
              <label
                style={{
                  color: "#e5e5e5",
                  fontSize: 12,
                  marginBottom: 4,
                  display: "block",
                }}
              >
                platforms
              </label>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <select
                  value={newPlatform}
                  onChange={(e) =>
                    setNewPlatform(e.target.value as ProjectPlatform)
                  }
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: "#0c0c0c",
                    border: "1px solid #1f1f1f",
                    color: "#e5e5e5",
                    fontSize: 14,
                    fontFamily: "inherit",
                    borderRadius: 4,
                  }}
                >
                  <option value="Vercel">Vercel</option>
                  <option value="VPS">VPS</option>
                  <option value="GitHub">GitHub</option>
                  <option value="Docker">Docker</option>
                </select>
                <button
                  type="button"
                  onClick={() => togglePlatform(newPlatform)}
                  disabled={formData.platforms.includes(newPlatform)}
                  style={{
                    padding: "8px 16px",
                    background: formData.platforms.includes(newPlatform)
                      ? "#1f1f1f"
                      : "#22c55e",
                    border: "none",
                    color: formData.platforms.includes(newPlatform)
                      ? "#525252"
                      : "#0c0c0c",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: formData.platforms.includes(newPlatform)
                      ? "not-allowed"
                      : "pointer",
                    borderRadius: 4,
                  }}
                >
                  add
                </button>
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {formData.platforms.map((p) => (
                  <span
                    key={p}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 8px",
                      background: "#1a1a1a",
                      border: "1px solid #252525",
                      color: "#737373",
                      fontSize: 10,
                      borderRadius: 4,
                    }}
                  >
                    {p}
                    <button
                      type="button"
                      onClick={() => togglePlatform(p)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#737373",
                        cursor: "pointer",
                        padding: 0,
                        fontSize: 12,
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Tech Stack */}
            <div>
              <label
                style={{
                  color: "#e5e5e5",
                  fontSize: 12,
                  marginBottom: 4,
                  display: "block",
                }}
              >
                tech_stack
              </label>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input
                  type="text"
                  value={newTechStack}
                  onChange={(e) => setNewTechStack(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTechStack();
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: "#0c0c0c",
                    border: "1px solid #1f1f1f",
                    color: "#e5e5e5",
                    fontSize: 14,
                    fontFamily: "inherit",
                    borderRadius: 4,
                  }}
                  placeholder="NextJS, Go, Rust..."
                />
                <button
                  type="button"
                  onClick={addTechStack}
                  disabled={!newTechStack.trim()}
                  style={{
                    padding: "8px 16px",
                    background: !newTechStack.trim() ? "#1f1f1f" : "#22c55e",
                    border: "none",
                    color: !newTechStack.trim() ? "#525252" : "#0c0c0c",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: !newTechStack.trim() ? "not-allowed" : "pointer",
                    borderRadius: 4,
                  }}
                >
                  add
                </button>
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {formData.techStack.map((tech) => (
                  <span
                    key={tech}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 8px",
                      background: "#1a1a1a",
                      border: "1px solid #252525",
                      color: "#3b82f6",
                      fontSize: 10,
                      borderRadius: 4,
                    }}
                  >
                    {tech}
                    <button
                      type="button"
                      onClick={() => removeTechStack(tech)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#3b82f6",
                        cursor: "pointer",
                        padding: 0,
                        fontSize: 12,
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Checkboxes */}
            <div style={{ display: "flex", gap: 16 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#e5e5e5",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.isLive}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      isLive: e.target.checked,
                    }))
                  }
                  style={{ width: 14, height: 14 }}
                />
                live
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#e5e5e5",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.isPrivate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      isPrivate: e.target.checked,
                    }))
                  }
                  style={{ width: 14, height: 14 }}
                />
                private
              </label>
            </div>
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 24,
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
              style={{
                padding: "8px 16px",
                background: "#1f1f1f",
                border: "none",
                color: "#e5e5e5",
                fontSize: 12,
                fontFamily: "inherit",
                cursor: "pointer",
                borderRadius: 4,
              }}
            >
              cancel
            </button>
            <button
              type="submit"
              disabled={!formData.name.trim() || !formData.url.trim()}
              style={{
                padding: "8px 16px",
                background:
                  !formData.name.trim() || !formData.url.trim()
                    ? "#1f1f1f"
                    : "#22c55e",
                border: "none",
                color:
                  !formData.name.trim() || !formData.url.trim()
                    ? "#525252"
                    : "#0c0c0c",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "inherit",
                cursor:
                  !formData.name.trim() || !formData.url.trim()
                    ? "not-allowed"
                    : "pointer",
                borderRadius: 4,
              }}
            >
              add_project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
