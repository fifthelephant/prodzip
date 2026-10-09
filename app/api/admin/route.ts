import { NextResponse } from "next/server";
import { hasAdminSession, sameOrigin } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sheetUrl = () => process.env.NEXT_PUBLIC_BACKEND_URL || process.env.SHEET_URL || "";

async function sheetAction(payload: Record<string, unknown>) {
  const url = sheetUrl();
  const token = process.env.SHEETS_ADMIN_TOKEN;
  if (!url || !token) throw new Error("Google Sheets admin integration is not configured on the server.");
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "admin", token, ...payload }),
    cache: "no-store",
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) throw new Error(result?.error || "Google Sheets could not complete the request.");
  return result;
}

export async function GET() {
  if (!await hasAdminSession()) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  try {
    return NextResponse.json(await sheetAction({ operation: "list" }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load inventory." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Request rejected." }, { status: 403 });
  if (!await hasAdminSession()) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const size = Number(request.headers.get("content-length") || 0);
  if (size > 5_000_000) return NextResponse.json({ error: "The upload is too large. Choose an image under 3 MB." }, { status: 413 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.operation !== "string") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (!["save-item", "delete-item", "save-discount", "delete-discount", "upload-image"].includes(body.operation)) {
    return NextResponse.json({ error: "Unsupported inventory action." }, { status: 400 });
  }
  try {
    return NextResponse.json(await sheetAction(body), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save changes." }, { status: 503 });
  }
}
