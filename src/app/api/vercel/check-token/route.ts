import { NextResponse } from "next/server";

export async function GET() {
  const hasToken = !!process.env.MY_VERCEL_TOKEN;
  return NextResponse.json({ hasToken });
}
