import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(req);
  if (authError) return authError;

  const hasToken = !!process.env.MY_VERCEL_TOKEN;
  return NextResponse.json({ hasToken });
}
