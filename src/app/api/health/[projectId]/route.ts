import { NextRequest, NextResponse } from "next/server";
import { checkProjectHealth } from "@/services/health-service";
import { requireAuth } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ projectId: string }> };

// ─── GET /api/health/:projectId ──────────────────────────────────────────────
// Public route - ping URL của project và trả về kết quả.
// Kết quả cũng được ghi lại vào Supabase (health_status, last_health_check).

export async function GET(
  _req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const authError = await requireAuth(_req);
  if (authError) return authError;

  const { projectId } = await params;

  try {
    const result = await checkProjectHealth(projectId);

    if (result.error === "Project not found") {
      return NextResponse.json(
        { error: "Project not found", projectId },
        { status: 404 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[GET /api/health/${projectId}]`, message);
    return NextResponse.json(
      { error: "Health check failed", detail: message },
      { status: 500 }
    );
  }
}
