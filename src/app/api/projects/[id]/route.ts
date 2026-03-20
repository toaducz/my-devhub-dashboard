import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { ProjectRepository } from "@/lib/project-repository";
import { getProjectById } from "@/services/project-service";

// ─── Zod schema ──────────────────────────────────────────────────────────────

const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  url: z.string().url().optional(),
  category: z.enum(["active", "learning", "research", "archive"]).optional(),
  platforms: z
    .array(z.enum(["Vercel", "VPS", "GitHub", "Docker"]))
    .optional(),
  techStack: z.array(z.string()).optional(),
  isLive: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
  vercelProjectId: z.string().nullable().optional(),
  healthStatus: z.enum(["healthy", "unhealthy", "unknown"]).nullable().optional(),
  lastHealthCheck: z.string().nullable().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

// ─── GET /api/projects/:id ───────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  try {
    const project = await getProjectById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ data: project });
  } catch (err: unknown) {
    console.error(`[GET /api/projects/${id}]`, err);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

// ─── PUT /api/projects/:id ───────────────────────────────────────────────────

export async function PUT(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  try {
    const body: unknown = await req.json();
    const parsed = UpdateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten() },
        { status: 422 }
      );
    }

    // Dùng server client có cookies để auth.uid() khớp với user_id → RLS pass
    const cookieStore = await cookies();
    const supabase = getServerClient(cookieStore);
    const repo = new ProjectRepository(supabase);

    // Map camelCase → snake_case
    const { name, description, url, category, platforms, techStack, isLive, isPrivate, vercelProjectId, healthStatus, lastHealthCheck } = parsed.data;
    const dbUpdates: Record<string, unknown> = {};
    if (name !== undefined) dbUpdates.name = name;
    if (description !== undefined) dbUpdates.description = description;
    if (url !== undefined) dbUpdates.url = url;
    if (category !== undefined) dbUpdates.category = category;
    if (platforms !== undefined) dbUpdates.platforms = platforms;
    if (techStack !== undefined) dbUpdates.tech_stack = techStack;
    if (isLive !== undefined) dbUpdates.is_live = isLive;
    if (isPrivate !== undefined) dbUpdates.is_private = isPrivate;
    if (vercelProjectId !== undefined) dbUpdates.vercel_project_id = vercelProjectId;
    if (healthStatus !== undefined) dbUpdates.health_status = healthStatus;
    if (lastHealthCheck !== undefined) dbUpdates.last_health_check = lastHealthCheck;

    await repo.updateProject(id, dbUpdates);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    console.error(`[PUT /api/projects/${id}]`, err);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/projects/:id ────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  try {
    const cookieStore = await cookies();
    const supabase = getServerClient(cookieStore);
    const repo = new ProjectRepository(supabase);

    await repo.deleteProject(id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    console.error(`[DELETE /api/projects/${id}]`, err);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
