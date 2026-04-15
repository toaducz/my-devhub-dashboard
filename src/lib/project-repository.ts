import { supabaseClient } from "./supabase";
import type { Project, ProjectStatus, ProjectPlatform } from "@/types/project";
import type { SupabaseClient } from "@supabase/supabase-js";

// Database types matching the schema
export interface DbProject {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  platforms: ProjectPlatform[];
  is_live: boolean;
  tech_stack: string[];
  url: string;
  category: "active" | "learning" | "research" | "archive";
  is_private: boolean;
  vercel_project_id: string | null;
  last_health_check: string | null;
  health_status: "healthy" | "unhealthy" | "unknown" | null;
  created_at: string;
  updated_at: string;
}

interface ProjectInsert {
  name: string;
  description: string | null;
  status: ProjectStatus;
  platforms: ProjectPlatform[];
  is_live: boolean;
  tech_stack: string[];
  url: string;
  category: "active" | "learning" | "research" | "archive";
  is_private?: boolean;
  vercel_project_id?: string | null;
}

interface ProjectUpdate {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
  platforms?: ProjectPlatform[];
  is_live?: boolean;
  tech_stack?: string[];
  url?: string;
  category?: "active" | "learning" | "research" | "archive";
  is_private?: boolean;
  vercel_project_id?: string | null;
  last_health_check?: string | null;
  health_status?: "healthy" | "unhealthy" | "unknown" | null;
}

type RealtimePayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: DbProject | null;
  old: DbProject | null;
};

// Transform database project to frontend Project type
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
    createdAt: dbProject.created_at,
  };
}

// Transform frontend ProjectInsert to database format
export function transformProjectInsert(data: {
  name: string;
  description: string;
  url: string;
  category: "active" | "learning" | "research" | "archive";
  platforms: ProjectPlatform[];
  techStack: string[];
  isLive: boolean;
  isPrivate?: boolean;
}): ProjectInsert {
  let status: ProjectStatus = "online";
  if (data.category === "learning" || data.category === "research") {
    status = data.category;
  } else if (data.category === "archive") {
    status = "offline";
  }

  return {
    name: data.name,
    description: data.description || null,
    status,
    platforms: data.platforms,
    is_live: data.isLive,
    tech_stack: data.techStack,
    url: data.url,
    category: data.category,
    is_private: data.isPrivate || false,
    vercel_project_id: null,
  };
}

// Data access class
export class ProjectRepository {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || supabaseClient;
  }

  // Fetch all projects (bao gồm cả private)
  async fetchAllProjects(): Promise<Project[]> {
    const { data, error } = await this.supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching projects:", error);
      throw error;
    }

    return (data as DbProject[]).map(transformDbProject);
  }

  // Fetch a single project by ID
  async fetchProjectById(id: string): Promise<Project | null> {
    const { data, error } = await this.supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      console.error("Error fetching project:", error);
      throw error;
    }

    return transformDbProject(data as DbProject);
  }

  // Insert a new project
  async insertProject(projectData: ProjectInsert): Promise<Project> {
    const { data, error } = await this.supabase
      .from("projects")
      .insert(projectData)
      .select()
      .single();

    if (error) {
      console.error("Error inserting project:", error);
      throw error;
    }

    return transformDbProject(data as DbProject);
  }

  // Update a project
  async updateProject(
    id: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updates: ProjectUpdate | Record<string, any>
  ): Promise<Project | null> {
    const { error } = await this.supabase
      .from("projects")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("Error updating project:", error);
      throw error;
    }

    return null;
  }

  // Delete a project
  async deleteProject(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from("projects")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting project:", error);
      throw error;
    }

    return true;
  }

  // Subscribe to real-time changes on projects table
  subscribeToProjects(callback: (payload: RealtimePayload | null) => void) {
    const channel = this.supabase.channel("projects-changes");

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
        },
        (payload: unknown) => {
          const typedPayload = payload as {
            eventType: string;
            new: unknown;
            old: unknown;
          };
          const eventType = typedPayload.eventType as
            | "INSERT"
            | "UPDATE"
            | "DELETE";
          const newRecord = typedPayload.new as DbProject | null;
          const oldRecord = typedPayload.old as DbProject | null;
          callback({ eventType, new: newRecord, old: oldRecord });
        }
      )
      .subscribe();

    return {
      unsubscribe: () => {
        this.supabase.removeChannel(channel);
      },
    };
  }

  // Fetch tags (for filtering)
  async fetchTags(): Promise<{ id: string; name: string; color: string }[]> {
    const { data, error } = await this.supabase
      .from("tags")
      .select("id, name, color")
      .order("name");

    if (error) {
      console.error("Error fetching tags:", error);
      throw error;
    }

    return data as { id: string; name: string; color: string }[];
  }

  // Fetch categories
  async fetchCategories(): Promise<{ key: string; label: string }[]> {
    const { data, error } = await this.supabase
      .from("categories")
      .select("key, label")
      .order("label");

    if (error) {
      console.error("Error fetching categories:", error);
      throw error;
    }

    return data as { key: string; label: string }[];
  }
}

// Singleton instance
let projectRepository: ProjectRepository | null = null;

export function getProjectRepository(
  supabase?: SupabaseClient
): ProjectRepository {
  if (supabase) return new ProjectRepository(supabase);
  if (!projectRepository) {
    projectRepository = new ProjectRepository();
  }
  return projectRepository;
}

// Helper functions for direct use
export async function fetchProjects(): Promise<Project[]> {
  return getProjectRepository().fetchAllProjects();
}

export async function fetchProjectById(id: string): Promise<Project | null> {
  return getProjectRepository().fetchProjectById(id);
}

export async function createProject(data: ProjectInsert): Promise<Project> {
  return getProjectRepository().insertProject(data);
}

export async function updateProject(
  id: string,
  updates: ProjectUpdate
): Promise<Project | null> {
  return getProjectRepository().updateProject(id, updates);
}

export async function removeProject(id: string): Promise<boolean> {
  return getProjectRepository().deleteProject(id);
}

export function subscribeToProjects(
  callback: (payload: RealtimePayload | null) => void
) {
  return getProjectRepository().subscribeToProjects(callback);
}
