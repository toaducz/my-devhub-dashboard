import { NextResponse } from "next/server";

export async function GET() {
  const hasToken = !!process.env.VERCEL_API_TOKEN;
  return NextResponse.json({ hasToken });
}
