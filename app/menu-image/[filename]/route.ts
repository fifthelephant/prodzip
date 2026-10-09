import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mimeTypes: Record<string, string> = { webp: "image/webp", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" };

export async function GET(_request: Request, context: { params: Promise<{ filename: string }> }) {
  const { filename } = await context.params;
  if (path.basename(filename) !== filename || !/^[a-zA-Z0-9_-]+\.(?:webp|png|jpe?g)$/i.test(filename)) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }
  const uploadDirectory = process.env.MK_UPLOAD_DIR?.trim()
    ? path.resolve(process.env.MK_UPLOAD_DIR.trim())
    : path.join(process.cwd(), "public", "uploads", "menu");
  try {
    const image = await readFile(path.join(uploadDirectory, filename));
    const extension = path.extname(filename).slice(1).toLowerCase();
    return new Response(image, { headers: { "Content-Type": mimeTypes[extension], "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }
}
