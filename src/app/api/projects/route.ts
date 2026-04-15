import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAllProjects, createProject } from "@/services/project-service";
import { requireAuth } from "@/lib/api-auth";

// ─── Zod schema (RULE.md: Luôn validate dữ liệu từ API) ─────────────────────

const CreateProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).default(""),
  url: z.string().url("Invalid URL"),
  category: z.enum(["active", "learning", "research", "archive"]),
  platforms: z
    .array(z.enum(["Vercel", "VPS", "GitHub", "Docker"]))
    .min(1, "At least one platform is required"),
  techStack: z.array(z.string()).default([]),
  isLive: z.boolean().default(true),
  isPrivate: z.boolean().default(false),
});

// ─── Sort params schema ──────────────────────────────────────────────────────

const SortBySchema = z.enum(["name", "createdAt"]).default("name");
const SortOrderSchema = z.enum(["asc", "desc"]).default("asc");

// ─── GET /api/projects ───────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);

    const sortBy = SortBySchema.parse(searchParams.get("sortBy") ?? "name");
    const sortOrder = SortOrderSchema.parse(
      searchParams.get("sortOrder") ?? "asc"
    );

    const projects = await getAllProjects();

    const sorted = [...projects].sort((a, b) => {
      if (sortBy === "name") {
        const cmp = a.name.localeCompare(b.name, undefined, {
          sensitivity: "base",
        });
        return sortOrder === "asc" ? cmp : -cmp;
      }

      // sortBy === "createdAt" — fall back to id string order (UUIDs are time-ordered via Supabase default)
      const cmp = a.id.localeCompare(b.id);
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return NextResponse.json({ data: sorted }, { status: 200 });
  } catch (err: unknown) {
    console.error("[GET /api/projects]", err);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// ─── POST /api/projects ──────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const body: unknown = await req.json();
    const parsed = CreateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const project = await createProject(parsed.data);
    return NextResponse.json({ data: project }, { status: 201 });
  } catch (err: unknown) {
    console.error("[POST /api/projects]", err);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
