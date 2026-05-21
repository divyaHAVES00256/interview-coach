import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PROTECTED_PREFIXES = ["/dashboard", "/interview", "/results"];

const AUTH_PREFIXES = ["/login", "/register"];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Read the httpOnly cookie — middleware CAN read these even though JS can't
  const token = request.cookies.get("access_token")?.value;

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  const isAuthPage = AUTH_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  // ── Case 1: Accessing a protected route ──────────────────────────────────
  if (isProtected) {
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET_KEY);
      await jwtVerify(token, secret);

      // Token is valid → let the request through
      return NextResponse.next();
    } catch (error) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("access_token");   // Clear the bad cookie
      response.cookies.delete("refresh_token");
      return response;
    }
  }

  // ── Case 2: Logged-in user visiting login/register ───────────────────────
  if (isAuthPage && token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET_KEY);
      await jwtVerify(token, secret);
      // Valid token + trying to visit login → redirect to dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } catch {
      // Invalid/expired token — let them visit the auth pages normally
      return NextResponse.next();
    }
  }

  // ── Case 3: Everything else (landing page, API routes, etc.) ────────────
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};