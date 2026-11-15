"use server";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit, endAllStaffSessions, rateLimit, requireStaff, startStaffSession } from "@/lib/auth";
import { one, q } from "@/lib/db";
import { checkPassword, tryDecrypt, encrypt, newBackupCodes, newTotpSecret, otpauthUrl, verifyTotp } from "@/lib/security";

export type Result = { ok: true; message?: string } | { ok: false; error: string };

/** Changing the password signs out every other device. */
export async function changePassword(current: string, next: string): Promise<Result> {
  const me = await requireStaff(undefined, { allowWithout2fa: true });
  if (!(await rateLimit(`pwchange:${me.id}`, 5, 10 * 60_000))) return { ok: false, error: "Too many attempts. Try again later." };
  const row = await one("SELECT password_hash FROM users WHERE id = $1", [me.id]);
  if (!row || !(await bcrypt.compare(z.string().max(200).parse(current), row.password_hash))) {
    await audit(me.email, "password_change_failed");
    return { ok: false, error: "Your current password is incorrect." };
  }
  const weak = checkPassword(next, { email: me.email, name: me.name });
  if (weak) return { ok: false, error: weak };
  await q("UPDATE users SET password_hash = $1, password_changed_at = now() WHERE id = $2", [await bcrypt.hash(next, 12), me.id]);
  await endAllStaffSessions(me.id);
  await startStaffSession(me.id);
  await audit(me.email, "password_changed");
  return { ok: true, message: "Password changed. Other devices were signed out." };
}

/** Step 1 of 2FA setup: create a secret (stored encrypted, not active yet) and show it as a QR code. */
export async function beginTotpSetup(): Promise<{ qr: string; secret: string }> {
  const me = await requireStaff(undefined, { allowWithout2fa: true });
  const secret = newTotpSecret();
  await q("UPDATE users SET totp_secret = $1, totp_enabled = false WHERE id = $2", [encrypt(secret), me.id]);
  const qr = await QRCode.toString(otpauthUrl(secret, me.email), { type: "svg", margin: 1 });
  return { qr, secret };
}

/** Step 2: prove the app works by entering a code. Returns backup codes exactly once. */
export async function confirmTotpSetup(code: string): Promise<{ ok: true; backupCodes: string[] } | { ok: false; error: string }> {
  const me = await requireStaff(undefined, { allowWithout2fa: true });
  if (!(await rateLimit(`totpsetup:${me.id}`, 10, 10 * 60_000))) return { ok: false, error: "Too many attempts. Try again later." };
  const row = await one("SELECT totp_secret FROM users WHERE id = $1", [me.id]);
  const secret = tryDecrypt(row?.totp_secret);
  if (!secret) return { ok: false, error: "Start the setup again." };
  const step = verifyTotp(secret, String(code).trim());
  if (step === null) return { ok: false, error: "That code didn't match. Check your phone's time is correct and try the newest code." };
  const { plain, hashes } = newBackupCodes();
  await q("UPDATE users SET totp_enabled = true, totp_last_step = $1, backup_codes = $2 WHERE id = $3", [step, hashes, me.id]);
  await audit(me.email, "2fa_enabled");
  revalidatePath("/account");
  return { ok: true, backupCodes: plain };
}

export async function disableTotp(code: string): Promise<Result> {
  const me = await requireStaff(undefined, { allowWithout2fa: true });
  if (me.role === "admin" && process.env.REQUIRE_ADMIN_2FA === "true") return { ok: false, error: "Two-step verification is required for admins." };
  const row = await one("SELECT totp_secret, totp_last_step FROM users WHERE id = $1 AND totp_enabled", [me.id]);
  if (!row) return { ok: false, error: "Two-step verification is not on." };
  const secret = tryDecrypt(row.totp_secret);
  if (!secret || verifyTotp(secret, String(code).trim(), Number(row.totp_last_step)) === null) return { ok: false, error: "That code didn't match." };
  await q("UPDATE users SET totp_enabled = false, totp_secret = NULL, backup_codes = '{}' WHERE id = $1", [me.id]);
  await audit(me.email, "2fa_disabled");
  revalidatePath("/account");
  return { ok: true, message: "Two-step verification is off." };
}

export async function signOutEverywhere() {
  const me = await requireStaff(undefined, { allowWithout2fa: true });
  await endAllStaffSessions(me.id);
  await audit(me.email, "signout_all_devices");
  redirect("/login");
}
