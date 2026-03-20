import { NextRequest, NextResponse } from "next/server";
import {
  createServerVercelClient,
  resolveVercelToken,
} from "@/services/vercel-service";

// ─── GET /api/vercel ─────────────────────────────────────────────────────────
// Proxy lấy tất cả Vercel projects của user (kể cả team projects).
// Token resolve theo thứ tự: cookie `vercel_token` → Authorization header → env MY_VERCEL_TOKEN

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Token resolution priority:
  // 1. .env MY_VERCEL_TOKEN (server-side, highest priority)
  // 2. Cookie vercel_token (client-side fallback)
  // 3. Authorization header (for explicit passing)
  const envToken = process.env.MY_VERCEL_TOKEN;
  const cookieToken = req.cookies.get("vercel_token")?.value;
  const authHeader = req.headers.get("Authorization");

  const token = envToken || cookieToken || resolveVercelToken(authHeader);

  if (!token) {
    return NextResponse.json(
      {
        error:
          "Vercel token required. Configure MY_VERCEL_TOKEN in .env, or set cookie `vercel_token`, or pass via `Authorization: Bearer <token>` header.",
      },
      { status: 401 }
    );
  }

  try {
    const client = createServerVercelClient(token);
    const result = await client.getProjects();

    // If there were errors but also have projects, return both
    if (result.errors.length > 0) {
      return NextResponse.json(
        {
          data: result.projects,
          warnings: result.errors,
        },
        { status: 206 } // Partial Content
      );
    }

    return NextResponse.json({ data: result.projects }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch Vercel projects", detail: message },
      { status: 502 }
    );
  }
}
