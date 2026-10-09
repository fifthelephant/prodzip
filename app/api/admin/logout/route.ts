import { NextResponse } from "next/server";
import { ADMIN_COOKIE, cookieOptions, sameOrigin } from "@/lib/admin/auth";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Request rejected." }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", { ...cookieOptions(request), maxAge: 0 });
  return response;
}
