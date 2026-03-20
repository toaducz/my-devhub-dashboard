import {
  getProjectRepository,
  transformProjectInsert,
  type DbProject,
} from "@/lib/project-repository";
import type { Project, ProjectPlatform } from "@/types/project";

// ─── Input types ────────────────────────────────────────────────────────────

export interface CreateProjectInput {
  name: string;
  description: string;
  url: string;
  category: "active" | "learning" | "research" | "archive";
  platforms: ProjectPlatform[];
  techStack: string[];
  isLive: boolean;
  isPrivate?: boolean;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  url?: string;
  category?: "active" | "learning" | "research" | "archive";
  platforms?: ProjectPlatform[];
  techStack?: string[];
  isLive?: boolean;
  isPrivate?: boolean;
  vercelProjectId?: string | null;
  healthStatus?: "healthy" | "unhealthy" | "unknown" | null;
  lastHealthCheck?: string | null;
}

// ─── Service functions ───────────────────────────────────────────────────────

/** Lấy tất cả projects công khai */
export async function getAllProjects(): Promise<Project[]> {
  return getProjectRepository().fetchAllProjects();
}

/** Lấy chi tiết 1 project theo id */
export async function getProjectById(id: string): Promise<Project | null> {
  return getProjectRepository().fetchProjectById(id);
}

/** Tạo mới project */
export async function createProject(input: CreateProjectInput): Promise<Project> {
  const dbData = transformProjectInsert({
    name: input.name,
    description: input.description,
    url: input.url,
    category: input.category,
    platforms: input.platforms,
    techStack: input.techStack,
    isLive: input.isLive,
    isPrivate: input.isPrivate,
  });
  return getProjectRepository().insertProject(dbData);
}

/** Cập nhật project theo id */
export async function updateProject(
  id: string,
  input: UpdateProjectInput
): Promise<Project | null> {
  // Map camelCase sang snake_case cho DB
  const dbUpdates: Partial<DbProject> = {};
  if (input.name !== undefined) dbUpdates.name = input.name;
  if (input.description !== undefined) dbUpdates.description = input.description;
  if (input.url !== undefined) dbUpdates.url = input.url;
  if (input.category !== undefined) dbUpdates.category = input.category;
  if (input.platforms !== undefined) dbUpdates.platforms = input.platforms;
  if (input.techStack !== undefined) dbUpdates.tech_stack = input.techStack;
  if (input.isLive !== undefined) dbUpdates.is_live = input.isLive;
  if (input.isPrivate !== undefined) dbUpdates.is_private = input.isPrivate;
  if (input.vercelProjectId !== undefined)
    dbUpdates.vercel_project_id = input.vercelProjectId;
  if (input.healthStatus !== undefined)
    dbUpdates.health_status = input.healthStatus;
  if (input.lastHealthCheck !== undefined)
    dbUpdates.last_health_check = input.lastHealthCheck;

  return getProjectRepository().updateProject(id, dbUpdates);
}

/** Xóa project theo id */
export async function deleteProject(id: string): Promise<boolean> {
  return getProjectRepository().deleteProject(id);
}
