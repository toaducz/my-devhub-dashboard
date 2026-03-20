import { NextResponse } from "next/server";
import { getDashboardHealth } from "@/services/health-service";

// ─── GET /api/health ─────────────────────────────────────────────────────────
// Public route - trả về uptime của chính dashboard.
// Đã được khai báo là public route trong middleware.ts.

export async function GET(): Promise<NextResponse> {
  const health = getDashboardHealth();
  return NextResponse.json(health, { status: 200 });
}
