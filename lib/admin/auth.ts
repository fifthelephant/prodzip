import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "mk_admin_session";
const SESSION_SECONDS = 60 * 60 * 12;

function secret() {
  return process.env.ADMIN_SESSION_SECRET || "";
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export function adminConfigured() {
  return Boolean(process.env.INVENTORY_ADMIN_USERNAME && process.env.INVENTORY_ADMIN_PASSWORD && secret());
}

export function credentialsMatch(username: string, password: string) {
  const expectedUser = process.env.INVENTORY_ADMIN_USERNAME || "";
  const expectedPassword = process.env.INVENTORY_ADMIN_PASSWORD || "";
  const safeEqual = (a: string, b: string) => {
    const aa = Buffer.from(a);
    const bb = Buffer.from(b);
    return aa.length === bb.length && timingSafeEqual(aa, bb);
  };
  return Boolean(expectedUser && expectedPassword && safeEqual(username, expectedUser) && safeEqual(password, expectedPassword));
}

export function createAdminSession() {
  if (!secret()) throw new Error("ADMIN_SESSION_SECRET is not configured.");
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function isAdminSessionValid(token: string | undefined) {
  if (!token || !secret()) return false;
  const [payload, supplied, extra] = token.split(".");
  if (!payload || !supplied || extra) return false;
  const expected = Buffer.from(sign(payload), "hex");
  const actual = Buffer.from(supplied, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number };
    return typeof data.exp === "number" && data.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

export async function hasAdminSession() {
  const jar = await cookies();
  return isAdminSessionValid(jar.get(ADMIN_COOKIE)?.value);
}

export function cookieOptions(request: Request) {
  const forwarded = request.headers.get("x-forwarded-proto");
  return {
    httpOnly: true,
    secure: forwarded ? forwarded.split(",")[0].trim() === "https" : new URL(request.url).protocol === "https:",
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_SECONDS,
  };
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host).split(",")[0].trim();
  const proto = (request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", "")).split(",")[0].trim();
  return origin === `${proto}://${host}`;
}
