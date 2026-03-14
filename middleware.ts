import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

const AUTH_PREFIX = "/api/auth";
const PUBLIC_ROUTES = new Set(["/login", "/signup"]);

const isInviteRoute = (pathname: string) => pathname.startsWith("/invite/");
const isPortalRoute = (pathname: string) => pathname.startsWith("/portal");

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith(AUTH_PREFIX)
  ) {
    return response;
  }

  if (user) {
    const tenantId = typeof user.user_metadata?.tenant_id === "string" ? user.user_metadata.tenant_id : "";
    if (tenantId) {
      response.headers.set("x-tenant-id", tenantId);
    }
  }

  if (PUBLIC_ROUTES.has(pathname) || isInviteRoute(pathname)) {
    return response;
  }

  if (!user) {
    if (isPortalRoute(pathname)) {
      return response;
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl, { headers: response.headers });
  }

  if (isPortalRoute(pathname)) {
    const role = typeof user.user_metadata?.role === "string" ? user.user_metadata.role : "";
    if (role !== "supplier") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      return NextResponse.redirect(redirectUrl, { headers: response.headers });
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};