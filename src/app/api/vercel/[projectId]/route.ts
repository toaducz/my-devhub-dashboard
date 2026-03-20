import { NextRequest, NextResponse } from "next/server";
import {
  createServerVercelClient,
  resolveVercelToken,
} from "@/services/vercel-service";

type RouteParams = { params: Promise<{ projectId: string }> };

// ─── GET /api/vercel/:projectId ──────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { projectId } = await params;

  // Token resolution priority: .env -> cookie -> Authorization header
  const envToken = process.env.MY_VERCEL_TOKEN;
  const cookieToken = req.cookies.get("vercel_token")?.value;
  const authHeader = req.headers.get("Authorization");

  const token = envToken || cookieToken || resolveVercelToken(authHeader);

  if (!token) {
    return NextResponse.json(
      {
        error:
          "Vercel token required. Configure MY_VERCEL_TOKEN in .env, set cookie, or pass Authorization header.",
      },
      { status: 401 }
    );
  }

  try {
    const client = createServerVercelClient(token);
    const project = await client.getProject(projectId);
    return NextResponse.json({ data: project }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";

    // Phân biệt 404 từ Vercel
    if (message.includes("404")) {
      return NextResponse.json(
        { error: "Vercel project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch Vercel project", detail: message },
      { status: 502 }
    );
  }
}
