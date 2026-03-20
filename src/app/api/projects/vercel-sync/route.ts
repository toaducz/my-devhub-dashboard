import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@supabase/ssr";
import { transformVercelProject } from "@/lib/vercel-api";
import { requireAuth } from "@/lib/api-auth";

// ─── POST /api/projects/vercel-sync ───────────────────────────────────────────
// Sync Vercel projects to database: update existing or insert new

const VercelSyncSchema = z.object({
  projects: z.array(z.any()), // VercelProject objects
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const body: unknown = await req.json();
    const parsed = VercelSyncSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const { projects: vercelProjects } = parsed.data;

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll() {
            // No-op in Route Handlers
          },
        },
      }
    );

    let syncedCount = 0;
    let insertedCount = 0;

    for (const vp of vercelProjects) {
      const insertData = transformVercelProject(vp);
      const vercelProjectId = insertData.vercel_project_id;

      if (!vercelProjectId) {
        continue;
      }

      // Check if project already exists by vercel_project_id
      const { data: existing, error: selectError } = await supabase
        .from("projects")
        .select("id")
        .eq("vercel_project_id", vercelProjectId)
        .single();

      if (selectError && selectError.code !== "PGRST116") {
        throw selectError;
      }

      if (existing) {
        // Update existing project (preserve custom fields like is_private, status, health, etc.)
        const { error: updateError } = await supabase
          .from("projects")
          .update({
            name: insertData.name,
            description: insertData.description,
            platforms: insertData.platforms,
            is_live: insertData.is_live,
            tech_stack: insertData.tech_stack,
            url: insertData.url,
            category: insertData.category,
            // Intentionally not updating: is_private, status, health_status, last_health_check
          })
          .eq("id", existing.id);

        if (updateError) {
          throw updateError;
        }
        syncedCount++;
      } else {
        // Insert new project
        const { error: insertError } = await supabase
          .from("projects")
          .insert({
            ...insertData,
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }
        insertedCount++;
      }
    }

    return NextResponse.json(
      { success: true, synced: syncedCount, inserted: insertedCount },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("[POST /api/projects/vercel-sync]", err);
    return NextResponse.json(
      { error: "Failed to sync Vercel projects" },
      { status: 500 }
    );
  }
}
