"use server";
import { headers } from "next/headers";
import { z } from "zod";
import { one, q } from "@/lib/db";
import { rateLimit, startStudentSession } from "@/lib/auth";
import { resumeCode } from "@/lib/seed";

const Code = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,10}$/);
const Name = z.string().trim().min(1).max(40).regex(/^[\p{L}\p{M}' .-]+$/u, "Letters only");

async function limited(bucket: string) {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  return !rateLimit(`${bucket}:${ip}`, 30, 60_000);
}

export type JoinLookup =
  | { ok: true; className: string; school: string; roster: { id: string; name: string; claimed: boolean }[] }
  | { ok: false; error: "not_found" | "rate_limited" };

/** Step 1: class code → class name and roster (first names only, to pick from). */
export async function lookupClass(raw: string): Promise<JoinLookup> {
  if (await limited("lookup")) return { ok: false, error: "rate_limited" };
  const code = Code.safeParse(raw);
  if (!code.success) return { ok: false, error: "not_found" };
  const cls = await one("SELECT id, name, school FROM classes WHERE join_code = $1", [code.data]);
  if (!cls) return { ok: false, error: "not_found" };
  const roster = await q(
    "SELECT id, display_name AS name, (token_hash IS NOT NULL) AS claimed FROM students WHERE class_id = $1 ORDER BY display_name",
    [cls.id]
  );
  return { ok: true, className: cls.name, school: cls.school, roster: roster as any };
}

export type JoinResult = { ok: true } | { ok: false; error: "not_found" | "claimed" | "invalid" | "rate_limited" };

/** Step 2a: pick your name from the roster. A name already in use on another device needs the resume code. */
export async function claimSeat(rawCode: string, studentId: string): Promise<JoinResult> {
  if (await limited("claim")) return { ok: false, error: "rate_limited" };
  const code = Code.safeParse(rawCode);
  if (!code.success || !z.string().uuid().safeParse(studentId).success) return { ok: false, error: "invalid" };
  const s = await one(
    "SELECT s.id, s.token_hash FROM students s JOIN classes c ON c.id = s.class_id WHERE c.join_code = $1 AND s.id = $2",
    [code.data, studentId]
  );
  if (!s) return { ok: false, error: "not_found" };
  if (s.token_hash) return { ok: false, error: "claimed" };
  await startStudentSession(s.id);
  return { ok: true };
}

/** Step 2b: not on the roster → add yourself (teachers see new names flagged on the dashboard). */
export async function joinAsNew(rawCode: string, rawName: string): Promise<JoinResult> {
  if (await limited("new")) return { ok: false, error: "rate_limited" };
  const code = Code.safeParse(rawCode);
  const name = Name.safeParse(rawName);
  if (!code.success || !name.success) return { ok: false, error: "invalid" };
  const cls = await one("SELECT id FROM classes WHERE join_code = $1", [code.data]);
  if (!cls) return { ok: false, error: "not_found" };
  const [s] = await q("INSERT INTO students (class_id, display_name, resume_code) VALUES ($1, $2, $3) RETURNING id", [
    cls.id,
    name.data,
    resumeCode(),
  ]);
  await startStudentSession(s.id);
  return { ok: true };
}

/** Continue on a new device with class code + personal resume code. */
export async function resume(rawCode: string, rawResume: string): Promise<JoinResult> {
  if (await limited("resume")) return { ok: false, error: "rate_limited" };
  const code = Code.safeParse(rawCode);
  const rc = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6}$/).safeParse(rawResume);
  if (!code.success || !rc.success) return { ok: false, error: "invalid" };
  const s = await one(
    "SELECT s.id FROM students s JOIN classes c ON c.id = s.class_id WHERE c.join_code = $1 AND s.resume_code = $2",
    [code.data, rc.data]
  );
  if (!s) return { ok: false, error: "not_found" };
  await startStudentSession(s.id);
  return { ok: true };
}
