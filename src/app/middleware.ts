import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  "/login",
  "/health",
  "/api/health",
  "/",
  "/api/projects",
];

// API routes that require auth (checked separately)
const PROTECTED_API_ROUTES = [
  "/api/vercel",
  "/api/projects/update",
  "/api/projects/delete",
];

// Page routes that require auth (admin-only)
const PROTECTED_ROUTES = ["/settings", "/tags"];

function isMatch(path: string, routes: string[]): boolean {
  return routes.some((r) => path === r || path.startsWith(r + "/"));
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Always allow public routes
  if (isMatch(pathname, PUBLIC_ROUTES)) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Mock mode: no Supabase configured → allow everything
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  // Build a response we can mutate (to set/refresh cookies)
  const response = NextResponse.next({ request });

  // ── Use @supabase/ssr so it reads cookies from the request ──────────────
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet) {
        // Set in both the forwarded request and the outgoing response
        toSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // getUser() is more reliable than getSession() in middleware
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthenticated = !!user;

  // Protected page routes → redirect to login
  if (isMatch(pathname, PROTECTED_ROUTES) && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect_to", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Protected API routes → 401 JSON
  if (isMatch(pathname, PROTECTED_API_ROUTES) && !isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
