"use client";

import { useState, useMemo } from "react";
import type { Project } from "@/types/project";

interface FilterTagsProps {
  onTagChange?: (tag: string) => void;
  activeTag?: string;
  projects?: Project[];
}

export default function FilterTags({
  onTagChange,
  activeTag = "all",
  projects = [],
}: FilterTagsProps) {
  const [internalActive, setInternalActive] = useState("all");

  // Use controlled or uncontrolled state
  const active = activeTag !== undefined ? activeTag : internalActive;
  const setActive = onTagChange || setInternalActive;

  // Extract all unique tags from projects
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    projects.forEach((project) => {
      project.platforms.forEach((p) => tagSet.add(p));
      project.techStack.forEach((t) => tagSet.add(t));
    });
    return ["all", ...Array.from(tagSet).sort()];
  }, [projects]);

  const handleClick = (tag: string) => {
    setActive(tag);
  };

  return (
    <div className="filter-tags-container flex items-center gap-2 flex-wrap justify-center">
      <span style={{ color: "#525252", fontSize: 11 }}>filter:</span>
      {allTags.map((tag) => {
        const isActive = active === tag;
        return (
          <button
            key={tag}
            onClick={() => handleClick(tag)}
            style={{
              padding: "4px 10px",
              background: isActive ? "#22c55e" : "#171717",
              border: isActive ? "none" : "1px solid #1f1f1f",
              color: isActive ? "#0c0c0c" : "#737373",
              fontSize: 11,
              fontWeight: isActive ? 600 : 400,
              fontFamily: "inherit",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
