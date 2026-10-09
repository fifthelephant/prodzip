import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_COOKIE = "mk_admin_session";

function keepsAdminSession(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/api/admin" || pathname.startsWith("/api/admin/");
}

function isPageNavigation(request: NextRequest) {
  if (request.headers.get("next-router-prefetch") === "1" || request.headers.get("purpose") === "prefetch") return false;
  const dest = request.headers.get("sec-fetch-dest");
  if (dest === "image" || dest === "font" || dest === "style" || dest === "script" || dest === "video" || dest === "audio") return false;
  if (dest === "document" || request.headers.get("rsc") === "1") return true;
  return (request.headers.get("accept") || "").includes("text/html");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (keepsAdminSession(pathname) || !request.cookies.has(ADMIN_COOKIE) || !isPageNavigation(request)) return NextResponse.next();
  const response = NextResponse.next();
  const forwarded = request.headers.get("x-forwarded-proto");
  const secure = forwarded ? forwarded.split(",")[0].trim() === "https" : request.nextUrl.protocol === "https:";
  response.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, secure, sameSite: "strict", path: "/", maxAge: 0 });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|woff2?)$).*)"],
};
