import { type NextRequest, NextResponse } from "next/server";

const protectedRoutes = ["/", "/plan", "/profile", "/schools", "/discover", "/advisor", "/chances", "/settings", "/onboarding", "/opportunities", "/summer-programs"];
const authRoutes = ["/login", "/auth"];

// Session cookie names
const SESSION_COOKIE = "sesame_session";
const USER_ID_COOKIE = "sesame_user_id";

interface SessionData {
  userId: string;
  email: string;
  createdAt: number;
  expiresAt: number;
}

function parseSession(token: string): SessionData | null {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const session = JSON.parse(decoded) as SessionData;

    // Check expiry
    if (session.expiresAt < Date.now()) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

function isAuthenticated(request: NextRequest): boolean {
  // Check for session cookie
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  if (sessionToken) {
    const session = parseSession(sessionToken);
    if (session) {
      return true;
    }
  }

  // Check for user ID cookie (fallback)
  const userId = request.cookies.get(USER_ID_COOKIE)?.value;
  if (userId) {
    return true;
  }

  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = isAuthenticated(request);

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  const isAuthRoute = authRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // Redirect to login if accessing protected route without auth
  if (isProtectedRoute && !authenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect to home if accessing auth routes while logged in
  if (isAuthRoute && authenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets
     * - api routes (they handle their own auth)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
