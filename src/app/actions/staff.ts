"use server";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { one, q } from "@/lib/db";
import { audit, cookieOpts, MFA_COOKIE, newToken, rateLimit, sha256, startStaffSession } from "@/lib/auth";
import { checkPassword, hashBackupCode, tryDecrypt, verifyTotp } from "@/lib/security";

// `values` lets a form keep what the user typed after an error (React resets forms after an action).
export type FormState = { error?: string; values?: Record<string, string> } | undefined;

const MAX_FAILURES = 5; // then the account is locked…
const LOCK_MINUTES = 15; // …for this long

// A real hash of a random string, compared against when the email is unknown (so timing doesn't reveal accounts).
const DUMMY_HASH = bcrypt.hashSync(Math.random().toString(36), 10);

const ip = async () => (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
const home = (role: string) => (role === "reviewer" ? "/curriculum" : role === "admin" ? "/admin" : "/teach");
const mustSetUp2fa = (role: string, enabled: boolean) => role === "admin" && !enabled && process.env.REQUIRE_ADMIN_2FA === "true";

const Login = z.object({ email: z.string().trim().toLowerCase().email().max(200), password: z.string().min(1).max(200) });

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const parsed = Login.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: "invalid" };
  const { email, password } = parsed.data;
  const values = { email };
  // Limits are shared across instances (Postgres): per IP and per targeted email.
  if (!(await rateLimit(`login:ip:${await ip()}`, 20, 60_000)) || !(await rateLimit(`login:email:${email}`, 10, 60_000))) return { error: "rate", values };

  const user = await one("SELECT id, password_hash, role, failed_logins, locked_until, totp_enabled FROM users WHERE email = $1", [email]);
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  const locked = user?.locked_until && new Date(user.locked_until).getTime() > Date.now();
  if (locked) {
    await audit(email, "login_while_locked");
    return { error: "locked", values };
  }
  if (!user || !ok) {
    if (user) {
      const failures = user.failed_logins + 1;
      if (failures >= MAX_FAILURES) {
        await q("UPDATE users SET failed_logins = 0, locked_until = now() + ($1 || ' minutes')::interval WHERE id = $2", [String(LOCK_MINUTES), user.id]);
        await audit(email, "account_locked", `${MAX_FAILURES} failed attempts`);
      } else {
        await q("UPDATE users SET failed_logins = $1 WHERE id = $2", [failures, user.id]);
      }
    }
    await audit(email, "login_failed");
    return { error: "invalid", values };
  }
  await q("UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = $1", [user.id]);

  if (user.totp_enabled) {
    // Password was right; now ask for the authenticator code. The challenge is single-use and expires in 5 minutes.
    const token = newToken();
    await q("INSERT INTO mfa_challenges (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '5 minutes')", [sha256(token), user.id]);
    (await cookies()).set(MFA_COOKIE, token, { ...cookieOpts(1), maxAge: 300 });
    await audit(email, "login_password_ok_awaiting_2fa");
    redirect("/login/verify");
  }
  await startStaffSession(user.id);
  await audit(email, "login");
  redirect(mustSetUp2fa(user.role, user.totp_enabled) ? "/account?setup2fa=required" : home(user.role));
}

/** Second sign-in step: a 6-digit authenticator code or a single-use backup code. */
export async function verifyMfa(_: FormState, form: FormData): Promise<FormState> {
  const jar = await cookies();
  const token = jar.get(MFA_COOKIE)?.value;
  if (!token) return { error: "expired" };
  if (!(await rateLimit(`mfa:${await ip()}`, 20, 60_000))) return { error: "rate" };
  const ch = await one(
    `SELECT c.token_hash, c.attempts, u.id, u.email, u.role, u.totp_secret, u.totp_last_step, u.backup_codes
     FROM mfa_challenges c JOIN users u ON u.id = c.user_id WHERE c.token_hash = $1 AND c.expires_at > now()`,
    [sha256(token)]
  );
  if (!ch || ch.attempts >= 5) {
    if (ch) await q("DELETE FROM mfa_challenges WHERE token_hash = $1", [ch.token_hash]);
    jar.delete(MFA_COOKIE);
    return { error: "expired" };
  }
  const code = String(form.get("code") ?? "").trim();
  let ok = false;
  const secret = tryDecrypt(ch.totp_secret);
  if (/^\d{6}$/.test(code) && secret) {
    const step = verifyTotp(secret, code, Number(ch.totp_last_step));
    if (step !== null) {
      ok = true;
      await q("UPDATE users SET totp_last_step = $1 WHERE id = $2", [step, ch.id]);
    }
  } else if (code.length >= 8) {
    const h = hashBackupCode(code);
    if ((ch.backup_codes as string[]).includes(h)) {
      ok = true;
      await q("UPDATE users SET backup_codes = array_remove(backup_codes, $1) WHERE id = $2", [h, ch.id]);
      await audit(ch.email, "backup_code_used");
    }
  }
  if (!ok) {
    await q("UPDATE mfa_challenges SET attempts = attempts + 1 WHERE token_hash = $1", [ch.token_hash]);
    await audit(ch.email, "2fa_failed");
    return { error: "invalid" };
  }
  await q("DELETE FROM mfa_challenges WHERE token_hash = $1", [ch.token_hash]);
  jar.delete(MFA_COOKIE);
  await startStaffSession(ch.id);
  await audit(ch.email, "login", "with 2FA");
  redirect(home(ch.role));
}

const Signup = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(200),
  organization: z.string().trim().min(2).max(120),
  password: z.string().max(200),
  role: z.enum(["instructor", "reviewer"]),
});

/** Self-serve for teachers and district reviewers outside CIC. Nobody can sign up as admin. */
export async function signup(_: FormState, form: FormData): Promise<FormState> {
  if (!(await rateLimit(`signup:${await ip()}`, 5, 10 * 60_000))) return { error: "rate" };
  const raw = Object.fromEntries(form) as Record<string, string>;
  // Echo back everything except the password so the form keeps it after an error.
  const values = { name: String(raw.name ?? ""), organization: String(raw.organization ?? ""), email: String(raw.email ?? ""), role: String(raw.role ?? "instructor") };
  const parsed = Signup.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "invalid", values };
  const weak = checkPassword(parsed.data.password, { email: parsed.data.email, name: parsed.data.name });
  if (weak) return { error: weak, values };
  const exists = await one("SELECT 1 FROM users WHERE email = $1", [parsed.data.email]);
  if (exists) return { error: "exists", values };
  const hash = await bcrypt.hash(parsed.data.password, 12);
  const [u] = await q("INSERT INTO users (email, name, password_hash, role, organization) VALUES ($1,$2,$3,$4,$5) RETURNING id", [
    parsed.data.email,
    parsed.data.name,
    hash,
    parsed.data.role,
    parsed.data.organization,
  ]);
  await audit(parsed.data.email, "signup", parsed.data.role);
  await startStaffSession(u.id);
  redirect(home(parsed.data.role));
}
