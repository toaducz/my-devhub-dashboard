import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseClient } from "@/lib/supabase";
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
  status: z
    .enum(["online", "offline", "learning", "research", "archive"])
    .optional(),
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

    const d = parsed.data;

    // Dùng SECURITY DEFINER RPC — bypass RLS, hoạt động cả local lẫn Vercel
    const { error } = await supabaseClient.rpc("update_project_fields", {
      p_id: id,
      p_name: d.name ?? null,
      p_description: d.description ?? null,
      p_url: d.url ?? null,
      p_category: d.category ?? null,
      p_platforms: d.platforms ?? null,
      p_tech_stack: d.techStack ?? null,
      p_is_live: d.isLive ?? null,
      p_is_private: d.isPrivate ?? null,
      p_status: d.status ?? null,
    });

    if (error) {
      console.error(`[PUT /api/projects/${id}] RPC error:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

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
    const { error } = await supabaseClient
      .from("projects")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(`[DELETE /api/projects/${id}] error:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    console.error(`[DELETE /api/projects/${id}]`, err);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
