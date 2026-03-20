import type { Project, ProjectStatus } from "@/types/project";

const STATUS_CONFIG: Record<
  ProjectStatus,
  { color: string; label: string; borderColor: string }
> = {
  online: { color: "#22c55e", label: "online", borderColor: "#22c55e" },
  offline: { color: "#ef4444", label: "offline", borderColor: "#ef4444" },
  learning: { color: "#f59e0b", label: "learning", borderColor: "#f59e0b" },
  research: { color: "#3b82f6", label: "research", borderColor: "#3b82f6" },
  archive: { color: "#525252", label: "archive", borderColor: "#1f1f1f" },
};

const HEALTH_CONFIG = {
  healthy: { color: "#22c55e", icon: "●" },
  unhealthy: { color: "#ef4444", icon: "●" },
  unknown: { color: "#525252", icon: "?" },
};

interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
}

export default function ProjectCard({ project, onEdit }: ProjectCardProps) {
  const status = STATUS_CONFIG[project.status];
  const projectUrl = project.url.startsWith("http")
    ? project.url
    : `https://${project.url}`;

  return (
    <a
      href={projectUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "block",
      }}
    >
      <div
        className="flex flex-col gap-3 flex-1"
        style={{
          padding: 16,
          background: "#171717",
          border: `1px solid ${status.borderColor}`,
          minWidth: 0,
          transition: "border-color 0.2s, background 0.2s",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#1a1a1a";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#171717";
        }}
      >
        {/* Header: status + platform tags + health */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: status.color,
                flexShrink: 0,
              }}
            />
            <span style={{ color: status.color, fontSize: 11 }}>
              {status.label}
            </span>
            {project.health && (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  color: HEALTH_CONFIG[project.health.status].color,
                  fontSize: 10,
                }}
                title={`Last ping: ${project.health.lastPing.toLocaleTimeString()}${
                  project.health.responseTime
                    ? ` • ${project.health.responseTime}ms`
                    : ""
                }`}
              >
                <span style={{ fontSize: 12 }}>
                  {HEALTH_CONFIG[project.health.status].icon}
                </span>
                {project.health.responseTime && (
                  <span style={{ color: "#525252" }}>
                    {project.health.responseTime}ms
                  </span>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {project.platforms.map((p) => (
              <span
                key={p}
                style={{
                  padding: "2px 6px",
                  background: "#1a1a1a",
                  border: "1px solid #252525",
                  color: "#737373",
                  fontSize: 10,
                }}
              >
                {p}
              </span>
            ))}
            {project.isLive && (
              <span
                style={{
                  padding: "2px 6px",
                  background: "#1a1a1a",
                  border: "1px solid #252525",
                  color: "#22c55e",
                  fontSize: 10,
                }}
              >
                Live
              </span>
            )}
            {onEdit && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(project); }}
                title="Edit project"
                style={{
                  background: "none",
                  border: "1px solid #252525",
                  color: "#525252",
                  cursor: "pointer",
                  padding: "2px 6px",
                  fontSize: 11,
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "center",
                  transition: "color 0.15s, border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#e5e5e5";
                  e.currentTarget.style.borderColor = "#525252";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#525252";
                  e.currentTarget.style.borderColor = "#252525";
                }}
              >
                ✎
              </button>
            )}
          </div>
        </div>

        {/* Project name */}
        <p
          style={{
            color: "#e5e5e5",
            fontSize: 15,
            fontWeight: 600,
            margin: 0,
          }}
        >
          {project.name}
        </p>

        {/* Description */}
        <p
          style={{
            color: "#737373",
            fontSize: 11,
            lineHeight: 1.6,
            margin: 0,
            flexGrow: 1,
          }}
        >
          {project.description}
        </p>

        {/* Footer: tech stack + url */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {project.techStack.map((tech) => (
              <span
                key={tech}
                style={{
                  padding: "2px 6px",
                  background: "#1a1a1a",
                  border: "1px solid #252525",
                  color: "#3b82f6",
                  fontSize: 10,
                }}
              >
                {tech}
              </span>
            ))}
          </div>
          <a
            href={`https://${project.url}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: project.status === "offline" ? "#ef4444" : "#525252",
              fontSize: 10,
              textDecoration: "none",
              transition: "color 0.15s",
            }}
          >
            {project.status === "offline" ? "↓ offline" : `${project.url} ↗`}
          </a>
        </div>
      </div>
    </a>
  );
}
