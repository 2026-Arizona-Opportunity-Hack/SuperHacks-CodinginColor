"use server";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { one, q } from "@/lib/db";
import { audit, rateLimit, startStaffSession } from "@/lib/auth";

export type FormState = { error?: string } | undefined;

// A real hash of a random string, compared against when the email is unknown (constant-time-ish login).
const DUMMY_HASH = bcrypt.hashSync(Math.random().toString(36), 10);

const ip = async () => (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

const Login = z.object({ email: z.string().trim().toLowerCase().email().max(200), password: z.string().min(1).max(200) });

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const parsed = Login.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: "invalid" };
  // 10 attempts per minute per IP and per email: stops brute force without locking out real users for long.
  if (!rateLimit(`login:${await ip()}`, 10, 60_000) || !rateLimit(`login:${parsed.data.email}`, 10, 60_000)) return { error: "rate" };
  const user = await one("SELECT id, password_hash, role FROM users WHERE email = $1", [parsed.data.email]);
  // Compare against a dummy hash when the user doesn't exist so timing doesn't reveal valid emails.
  const ok = await bcrypt.compare(parsed.data.password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) {
    await audit(parsed.data.email, "login_failed");
    return { error: "invalid" };
  }
  await startStaffSession(user.id);
  await audit(parsed.data.email, "login");
  redirect(user.role === "reviewer" ? "/curriculum" : user.role === "admin" ? "/admin" : "/teach");
}

const Signup = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(200),
  organization: z.string().trim().min(2).max(120),
  password: z.string().min(10, "Use at least 10 characters").max(200),
  role: z.enum(["instructor", "reviewer"]),
});

/** Self-serve for teachers and district reviewers outside CIC. Nobody can sign up as admin. */
export async function signup(_: FormState, form: FormData): Promise<FormState> {
  if (!rateLimit(`signup:${await ip()}`, 5, 10 * 60_000)) return { error: "rate" };
  const parsed = Signup.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "invalid" };
  const exists = await one("SELECT 1 FROM users WHERE email = $1", [parsed.data.email]);
  if (exists) return { error: "exists" };
  const hash = await bcrypt.hash(parsed.data.password, 10);
  const [u] = await q("INSERT INTO users (email, name, password_hash, role, organization) VALUES ($1,$2,$3,$4,$5) RETURNING id", [
    parsed.data.email,
    parsed.data.name,
    hash,
    parsed.data.role,
    parsed.data.organization,
  ]);
  await audit(parsed.data.email, "signup", parsed.data.role);
  await startStaffSession(u.id);
  redirect(parsed.data.role === "reviewer" ? "/curriculum" : "/teach");
}
