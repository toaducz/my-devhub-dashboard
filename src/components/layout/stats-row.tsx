"use client";

import { useMemo } from "react";
import type { Project } from "@/types/project";

interface StatsRowProps {
  projects?: Project[];
}

export default function StatsRow({ projects = [] }: StatsRowProps) {
  const stats = useMemo(() => {
    const online = projects.filter((p) => p.status === "online").length;
    const offline = projects.filter((p) => p.status === "offline").length;
    const unchecked = projects.filter((p) => !p.health).length;
    const vercelSynced = projects.filter((p) => p.isVercelSynced).length;

    return { online, offline, unchecked, vercelSynced };
  }, [projects]);

  const STAT_ITEMS = [
    { label: "online", count: stats.online, color: "#22c55e" },
    { label: "offline", count: stats.offline, color: "#ef4444" },
    { label: "unchecked", count: stats.unchecked, color: "#f59e0b" },
    { label: "vercel_synced", count: stats.vercelSynced, color: "#a3a3a3" },
  ];

  return (
    <div className="flex gap-3 w-full">
      {STAT_ITEMS.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-2 flex-1"
          style={{
            padding: "12px 16px",
            background: "#171717",
            border: "1px solid #1f1f1f",
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: stat.color,
              flexShrink: 0,
            }}
          />
          <span style={{ color: stat.color, fontSize: 13, fontWeight: 500 }}>
            {stat.count} {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}
