// Vercel API integration for fetching projects and health checks
// Client-side: dùng class VercelAPI bên dưới (token lưu trong cookie)
// Server-side: dùng createServerVercelClient từ @/services/vercel-service
import Cookies from "js-cookie";

// Re-export server-side helpers để import từ 1 nơi
export {
  createServerVercelClient,
  resolveVercelToken,
} from "@/services/vercel-service";

export interface VercelProject {
  id: string;
  name: string;
  framework: string | null;
  state: "ERROR" | "READY" | "BUILDING" | "QUEUED";
  lastDeployedAt: string | null;
  url: string | null;
  createdAt: string;
  updatedAt: string;
  team?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface VercelTeam {
  id: string;
  name: string;
  slug: string;
  avatar?: string;
}

class VercelAPI {
  private token: string | null = null;
  private baseUrl = "https://api.vercel.com/v1";
  private readonly COOKIE_NAME = "vercel_token";
  private readonly COOKIE_OPTIONS = {
    expires: 30,
    secure: true,
    sameSite: "strict" as const,
  };

  constructor() {
    // Load token from cookie on initialization
    this.token = this.getTokenFromCookie();
  }

  // Cookie-based token management
  hasToken(): boolean {
    return !!Cookies.get(this.COOKIE_NAME);
  }

  setToken(token: string) {
    this.token = token;
    Cookies.set(this.COOKIE_NAME, token, this.COOKIE_OPTIONS);
  }

  clearToken() {
    this.token = null;
    Cookies.remove(this.COOKIE_NAME);
  }

  private getTokenFromCookie(): string | null {
    return Cookies.get(this.COOKIE_NAME) ?? null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.token) {
      throw new Error("Vercel token not set");
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      throw new Error(
        `Vercel API error: ${response.status} - ${
          error.message || response.statusText
        }`
      );
    }

    return response.json();
  }

  // Get all projects for a user (across all teams)
  async getProjects(): Promise<{
    projects: VercelProject[];
    errors: string[];
  }> {
    const allProjects: VercelProject[] = [];
    const errors: string[] = [];

    // Get user's own projects
    try {
      const { projects = [] } = await this.request<{
        projects: VercelProject[];
      }>("/projects");
      allProjects.push(...projects);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`User projects: ${errorMsg}`);
    }

    // Get team projects
    try {
      const teams = await this.request<{ teams: VercelTeam[] }>("/teams");
      for (const team of teams.teams) {
        try {
          const { projects = [] } = await this.request<{
            projects: VercelProject[];
          }>(`/projects?teamId=${team.id}`);
          // Add team info to projects
          projects.forEach((p) => {
            p.team = team;
          });
          allProjects.push(...projects);
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          errors.push(`Team ${team.name}: ${errorMsg}`);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Teams list: ${errorMsg}`);
    }

    return { projects: allProjects, errors };
  }

  // Get project details
  async getProject(projectId: string): Promise<VercelProject> {
    return this.request<VercelProject>(`/projects/${projectId}`);
  }

  // Get project domains
  async getProjectDomains(
    projectId: string
  ): Promise<{ domains: { domain: string; id: string }[] }> {
    return this.request(`/projects/${projectId}/domains`);
  }

  // Trigger a redeploy
  async redeploy(
    projectId: string
  ): Promise<{ job: { id: string; state: string } }> {
    return this.request(`/projects/${projectId}/redeploy`, {
      method: "POST",
    });
  }

  // Get deployment status
  async getDeployment(
    deploymentId: string
  ): Promise<{ deployment: { id: string; state: string; url?: string } }> {
    return this.request(`/deployments/${deploymentId}`);
  }
}

// Singleton instance
export const vercelAPI = new VercelAPI();

// Project insert type
export type ProjectInsert = {
  id?: string;
  name: string;
  description: string;
  status: "online" | "offline" | "learning" | "research" | "archive";
  platforms: string[];
  is_live: boolean;
  tech_stack: string[];
  url: string;
  category: "active" | "learning" | "research" | "archive";
  is_private?: boolean;
  vercel_project_id?: string | null;
};

// Helper to transform Vercel project to our Project format
export function transformVercelProject(
  vercelProject: VercelProject,
  existingProjectId?: string
): ProjectInsert {
  const isLive = vercelProject.state === "READY" && vercelProject.url !== null;

  // Ensure URL has https:// prefix
  let url = vercelProject.url || `${vercelProject.name}.vercel.app`;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  return {
    id: existingProjectId,
    name: vercelProject.name,
    description: `// Vercel project${
      vercelProject.team ? ` in team ${vercelProject.team.name}` : ""
    }`,
    status:
      vercelProject.state === "READY"
        ? "online"
        : vercelProject.state === "BUILDING"
        ? "learning"
        : "offline",
    platforms: ["Vercel"],
    is_live: isLive,
    tech_stack: vercelProject.framework ? [vercelProject.framework] : [],
    url,
    category: "active",
    is_private: false,
    vercel_project_id: vercelProject.id,
  };
}
