import "server-only";
import { NextResponse } from "next/server";

/** CSRF defence for JSON endpoints: browsers always send Origin on POST; it must be us. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export const jsonError = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function readJson(req: Request, maxBytes = 64_000): Promise<unknown> {
  const text = await req.text();
  if (text.length > maxBytes) throw new Error("too large");
  return JSON.parse(text);
}
