export type ProjectStatus =
  | "online"
  | "offline"
  | "learning"
  | "research"
  | "archive";

export type ProjectPlatform = "Vercel" | "VPS" | "GitHub" | "Docker";

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  platforms: ProjectPlatform[];
  isLive: boolean;
  techStack: string[];
  url: string;
  category: "active" | "learning" | "research" | "archive";
  isPrivate: boolean;
  isVercelSynced?: boolean;
  vercel_project_id?: string | null;
  health?: {
    lastPing: Date;
    status: "healthy" | "unhealthy" | "unknown";
    responseTime?: number;
  };
  createdAt?: string;
}

export interface CategoryCount {
  key: string;
  label: string;
  count: number;
}

export interface HealthStatus {
  lastPing: Date;
  status: "healthy" | "unhealthy" | "unknown";
  responseTime?: number;
}
