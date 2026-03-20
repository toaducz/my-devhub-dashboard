import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAllProjects, createProject } from "@/services/project-service";

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

// ─── GET /api/projects ───────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  try {
    const projects = await getAllProjects();
    return NextResponse.json({ data: projects }, { status: 200 });
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
