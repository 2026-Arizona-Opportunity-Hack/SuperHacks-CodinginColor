import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { one, q } from "./db";

/**
 * Two kinds of identity:
 *  - Staff (admin / instructor / reviewer): email + bcrypt password → session cookie.
 *  - Students: no account. Joining a class sets a device cookie; a resume code moves them between devices.
 * Cookies are httpOnly, SameSite=Lax, Secure in production, and only hashes of tokens are stored.
 */

export type Role = "admin" | "instructor" | "reviewer";
export type StaffUser = { id: string; email: string; name: string; role: Role; organization: string; totp_enabled: boolean };
export type Student = { id: string; class_id: string; display_name: string; resume_code: string; xp: number };

// In production the __Host- prefix makes the browser enforce Secure, Path=/ and no Domain,
// so a sibling subdomain can never set or overwrite these cookies.
const PROD = process.env.NODE_ENV === "production";
const STAFF_COOKIE = PROD ? "__Host-cic_session" : "cic_session";
const STUDENT_COOKIE = PROD ? "__Host-cic_student" : "cic_student";
export const MFA_COOKIE = PROD ? "__Host-cic_mfa" : "cic_mfa";
const SESSION_DAYS = 14;

export const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
export const newToken = () => crypto.randomBytes(32).toString("base64url");

export const cookieOpts = (maxAgeDays: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: maxAgeDays * 86400,
});

// ── Staff ──

export async function startStaffSession(userId: string) {
  const token = newToken();
  await q("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + ($3 || ' days')::interval)", [
    sha256(token),
    userId,
    String(SESSION_DAYS),
  ]);
  (await cookies()).set(STAFF_COOKIE, token, cookieOpts(SESSION_DAYS));
}

export async function endStaffSession() {
  const jar = await cookies();
  const token = jar.get(STAFF_COOKIE)?.value;
  if (token) await q("DELETE FROM sessions WHERE token_hash = $1", [sha256(token)]);
  jar.delete(STAFF_COOKIE);
}

export async function endAllStaffSessions(userId: string) {
  await q("DELETE FROM sessions WHERE user_id = $1", [userId]);
}

export async function currentStaff(): Promise<StaffUser | null> {
  const token = (await cookies()).get(STAFF_COOKIE)?.value;
  if (!token) return null;
  return one<StaffUser>(
    `SELECT u.id, u.email, u.name, u.role, u.organization, u.totp_enabled FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [sha256(token)]
  );
}

/** For pages and server actions: redirects to /login, or to / if the role is not allowed. */
export async function requireStaff(roles: Role[] = ["admin", "instructor", "reviewer"], opts: { allowWithout2fa?: boolean } = {}): Promise<StaffUser> {
  const user = await currentStaff();
  if (!user) redirect("/login");
  if (!roles.includes(user.role)) redirect("/");
  // With REQUIRE_ADMIN_2FA=true, admins can't reach anything until two-step verification is on.
  if (user.role === "admin" && !user.totp_enabled && process.env.REQUIRE_ADMIN_2FA === "true" && !opts.allowWithout2fa) {
    redirect("/account?setup2fa=required");
  }
  return user;
}

/** Can this user see/manage this class? Admins see all; instructors only their own. */
export async function canManageClass(user: StaffUser, classId: string): Promise<boolean> {
  if (user.role === "admin") return true;
  if (user.role !== "instructor") return false;
  const row = await one("SELECT 1 FROM classes WHERE id = $1 AND instructor_id = $2", [classId, user.id]);
  return !!row;
}

// ── Students ──

export async function startStudentSession(studentId: string) {
  const token = newToken();
  await q("UPDATE students SET token_hash = $1, claimed_at = coalesce(claimed_at, now()), last_active = now() WHERE id = $2", [
    sha256(token),
    studentId,
  ]);
  (await cookies()).set(STUDENT_COOKIE, token, cookieOpts(180));
}

export async function currentStudent(): Promise<Student | null> {
  const token = (await cookies()).get(STUDENT_COOKIE)?.value;
  if (!token) return null;
  return one<Student>("SELECT id, class_id, display_name, resume_code, xp FROM students WHERE token_hash = $1", [sha256(token)]);
}

export async function endStudentSession() {
  (await cookies()).delete(STUDENT_COOKIE);
}

export async function audit(actor: string, action: string, target = "") {
  await q("INSERT INTO audit_log (actor, action, target) VALUES ($1, $2, $3)", [actor, action, target]);
}

// Rate limiting lives in ./security (Postgres-backed so it holds across serverless instances).
export { rateLimit } from "./security";
