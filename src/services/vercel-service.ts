import type { VercelProject, VercelTeam } from "@/lib/vercel-api";

// Vercel API base URL
const VERCEL_BASE_URL = "https://api.vercel.com/v1";

// ─── Server-side Vercel client ───────────────────────────────────────────────

/**
 * Tạo một server-side Vercel API client.
 * Token được truyền vào explict (từ env hoặc Authorization header).
 * Không phụ thuộc vào js-cookie.
 */
export function createServerVercelClient(token: string) {
  async function request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const res = await fetch(`${VERCEL_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
      // Force no caching on server-side
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(
        `Vercel API ${res.status}: ${err.message ?? res.statusText}`
      );
    }

    return res.json() as Promise<T>;
  }

  return {
    /** Lấy tất cả projects của user (bao gồm team projects) */
    async getProjects(): Promise<{
      projects: VercelProject[];
      errors: string[];
    }> {
      const all: VercelProject[] = [];
      const errors: string[] = [];

      try {
        // Fetch all pages for user projects
        let page = 1;
        const limit = 100; // Max per page
        const userProjects: VercelProject[] = [];

        while (true) {
          const response = await request<
            | VercelProject[]
            | { projects: VercelProject[]; pagination?: { total: number } }
          >(`/projects?limit=${limit}&offset=${(page - 1) * limit}`);

          // Vercel API can return either an array or { projects: [], pagination: {} }
          const projects = Array.isArray(response)
            ? response
            : (response as { projects: VercelProject[] }).projects || [];

          userProjects.push(...projects);

          // Break if we got fewer than limit (last page) or no projects
          if (projects.length < limit || projects.length === 0) {
            break;
          }
          page++;
        }

        all.push(...userProjects);
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        errors.push(`User projects: ${errorMsg}`);
      }

      try {
        const teamsResponse = await request<{ teams: VercelTeam[] }>("/teams");
        const { teams = [] } = teamsResponse;
        for (const team of teams) {
          try {
            // Fetch all pages for team projects
            let page = 1;
            const limit = 100;
            const teamProjects: VercelProject[] = [];

            while (true) {
              const teamPageResponse = await request<
                | VercelProject[]
                | { projects: VercelProject[]; pagination?: { total: number } }
              >(
                `/projects?teamId=${team.id}&limit=${limit}&offset=${
                  (page - 1) * limit
                }`
              );

              // Vercel API can return either an array or { projects: [], pagination: {} }
              const projects = Array.isArray(teamPageResponse)
                ? teamPageResponse
                : (teamPageResponse as { projects: VercelProject[] })
                    .projects || [];

              teamProjects.push(...projects);

              if (projects.length < limit || projects.length === 0) {
                break;
              }
              page++;
            }

            teamProjects.forEach((p) => {
              p.team = team;
            });
            all.push(...teamProjects);
          } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            errors.push(`Team ${team.name}: ${errorMsg}`);
          }
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        errors.push(`Teams list: ${errorMsg}`);
      }

      // Deduplicate projects by ID (team projects may overlap with user projects)
      const uniqueProjects = Array.from(
        new Map(all.map((p) => [p.id, p])).values()
      );

      return { projects: uniqueProjects, errors };
    },

    /** Lấy chi tiết 1 project theo ID */
    async getProject(projectId: string): Promise<VercelProject> {
      return request<VercelProject>(`/projects/${projectId}`);
    },
  };
}

// ─── Token resolution helper ─────────────────────────────────────────────────

/**
 * Lấy Vercel token ưu tiên theo thứ tự:
 * 1. Authorization header từ request
 * 2. Biến môi trường MY_VERCEL_TOKEN (server-only)
 */
export function resolveVercelToken(
  authorizationHeader: string | null
): string | null {
  if (authorizationHeader?.startsWith("Bearer ")) {
    return authorizationHeader.slice(7);
  }
  return process.env.MY_VERCEL_TOKEN ?? null;
}
