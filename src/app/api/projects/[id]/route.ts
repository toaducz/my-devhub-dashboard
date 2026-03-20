import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getProjectById,
  updateProject,
  deleteProject,
} from "@/services/project-service";

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

    const updated = await updateProject(id, parsed.data);
    // updateProject returns null (fire-and-forget style), treat success as ok
    void updated;
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
    await deleteProject(id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    console.error(`[DELETE /api/projects/${id}]`, err);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
