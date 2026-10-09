import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminConfigured, cookieOptions, createAdminSession, credentialsMatch, sameOrigin } from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Request rejected." }, { status: 403 });
  if (!adminConfigured()) return NextResponse.json({ error: "Admin login is not configured on the server yet." }, { status: 503 });
  const body = await request.json().catch(() => null) as { username?: string; password?: string } | null;
  if (!body || typeof body.username !== "string" || typeof body.password !== "string" || body.username.length > 120 || body.password.length > 200) {
    return NextResponse.json({ error: "Enter your username and password." }, { status: 400 });
  }
  if (!credentialsMatch(body.username, body.password)) return NextResponse.json({ error: "The username or password is incorrect." }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, createAdminSession(), cookieOptions(request));
  return response;
}
