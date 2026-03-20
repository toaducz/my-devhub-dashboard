import { supabaseClient } from "@/lib/supabase";
import { getProjectById } from "./project-service";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HealthCheckResult {
  projectId: string;
  url: string;
  status: "healthy" | "unhealthy" | "unknown";
  responseTime: number | null;
  checkedAt: string;
  httpStatus?: number;
  error?: string;
}

// ─── Service functions ───────────────────────────────────────────────────────

/**
 * Ping một URL và trả về kết quả health check.
 * Timeout sau 10 giây.
 */
export async function pingUrl(
  url: string
): Promise<{ status: "healthy" | "unhealthy"; responseTime: number; httpStatus: number } | { status: "unhealthy"; responseTime: null; error: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  const start = Date.now();

  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      // Không follow redirects vô hạn
      redirect: "follow",
    });
    clearTimeout(timeoutId);
    const responseTime = Date.now() - start;

    return {
      status: res.ok ? "healthy" : "unhealthy",
      responseTime,
      httpStatus: res.status,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const message =
      err instanceof Error ? err.message : "Unknown error";
    return {
      status: "unhealthy",
      responseTime: null,
      error: message,
    };
  }
}

/**
 * Kiểm tra health của 1 project theo ID.
 * Ghi kết quả vào Supabase sau khi ping.
 */
export async function checkProjectHealth(
  projectId: string
): Promise<HealthCheckResult> {
  const project = await getProjectById(projectId);

  if (!project) {
    return {
      projectId,
      url: "",
      status: "unknown",
      responseTime: null,
      checkedAt: new Date().toISOString(),
      error: "Project not found",
    };
  }

  const url = project.url.startsWith("http")
    ? project.url
    : `https://${project.url}`;

  const pingResult = await pingUrl(url);
  const checkedAt = new Date().toISOString();

  // Ghi kết quả vào DB qua RPC (SECURITY DEFINER — bypass RLS an toàn)
  try {
    const { error } = await supabaseClient.rpc("update_project_health", {
      p_id: projectId,
      p_health_status: pingResult.status,
      p_last_health_check: checkedAt,
    });
    if (error) throw error;
  } catch (e) {
    console.error("[health-service] Failed to save health check:", e);
  }

  return {
    projectId,
    url,
    status: pingResult.status,
    responseTime: pingResult.responseTime,
    checkedAt,
    ...("httpStatus" in pingResult && { httpStatus: pingResult.httpStatus }),
    ...("error" in pingResult && { error: pingResult.error }),
  };
}

/**
 * Trả về thông tin uptime của chính dashboard này.
 */
export function getDashboardHealth(): {
  status: "ok";
  uptime: number;
  timestamp: string;
} {
  return {
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
}
