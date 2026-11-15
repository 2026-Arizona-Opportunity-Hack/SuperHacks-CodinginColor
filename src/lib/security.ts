import "server-only";
import crypto from "crypto";
import { q } from "./db";

/**
 * Security primitives shared by the whole app:
 *  - rateLimit(): Postgres-backed fixed-window limiter, so limits hold across serverless instances
 *  - encrypt()/decrypt(): AES-256-GCM for secrets at rest (2FA seeds), keyed by AUTH_SECRET
 *  - TOTP (RFC 6238) two-factor codes and single-use backup codes
 *  - checkPassword(): password policy for staff accounts
 */

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

// ── Rate limiting ──

/** Returns true if this request is allowed. Atomic upsert: count resets when the window expires. */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const [row] = await q<{ count: number }>(
    `INSERT INTO rate_limits (key_hash, count, reset_at) VALUES ($1, 1, now() + ($2 || ' milliseconds')::interval)
     ON CONFLICT (key_hash) DO UPDATE SET
       count    = CASE WHEN rate_limits.reset_at < now() THEN 1 ELSE rate_limits.count + 1 END,
       reset_at = CASE WHEN rate_limits.reset_at < now() THEN EXCLUDED.reset_at ELSE rate_limits.reset_at END
     RETURNING count`,
    [sha256(key), String(windowMs)]
  );
  // Housekeeping: occasionally drop expired windows.
  if (Math.random() < 0.02) await q("DELETE FROM rate_limits WHERE reset_at < now() - interval '1 hour'");
  return row.count <= limit;
}

// ── Encryption at rest ──

function key(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production" && process.env.SEED_DEMO_DATA === "false") {
    throw new Error("AUTH_SECRET must be set in production");
  }
  // Dev/demo fallback keeps the app runnable; production installs set AUTH_SECRET (see docs/deploy.md).
  return crypto.createHash("sha256").update(secret || "cic-learn-dev-only-secret").digest();
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

export function decrypt(token: string): string {
  const [v, iv, tag, body] = token.split(".");
  if (v !== "v1") throw new Error("Unknown ciphertext version");
  const d = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(body, "base64url")), d.final()]).toString("utf8");
}

/** decrypt() that returns null instead of throwing (e.g. AUTH_SECRET was rotated): callers fail closed. */
export function tryDecrypt(token: string | null | undefined): string | null {
  if (!token) return null;
  try {
    return decrypt(token);
  } catch {
    return null;
  }
}

// ── TOTP (RFC 6238, 30 s steps, 6 digits, SHA-1: what every authenticator app supports) ──

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Buffer {
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of s.replace(/=+$/, "").toUpperCase()) {
    const i = B32.indexOf(ch);
    if (i < 0) continue;
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export const newTotpSecret = () => base32Encode(crypto.randomBytes(20));

export function totpAt(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const h = crypto.createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const o = h[h.length - 1] & 15;
  const code = ((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).toString();
  return code.padStart(6, "0");
}

/** Accepts the current code or one step either side (clock drift). Returns the matched step, or null. */
export function verifyTotp(secret: string, code: string, lastStep = 0, now = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const step = Math.floor(now / 30_000);
  for (const s of [step, step - 1, step + 1]) {
    if (s <= lastStep) continue; // a code can be used only once
    const expected = totpAt(secret, s);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(code))) return s;
  }
  return null;
}

export const otpauthUrl = (secret: string, email: string) =>
  `otpauth://totp/${encodeURIComponent(`CIC Learn:${email}`)}?secret=${secret}&issuer=${encodeURIComponent("CIC Learn")}&algorithm=SHA1&digits=6&period=30`;

export function newBackupCodes(): { plain: string[]; hashes: string[] } {
  const plain = Array.from({ length: 8 }, () => {
    const raw = base32Encode(crypto.randomBytes(5)).slice(0, 8).toLowerCase();
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  });
  return { plain, hashes: plain.map((c) => sha256(c.replace("-", ""))) };
}
export const hashBackupCode = (code: string) => sha256(code.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));

// ── Password policy ──

// The most common passwords in public breach lists (abridged); anything here is refused outright.
const COMMON = new Set(
  "password password1 password123 123456789012 qwertyuiop12 iloveyou1234 welcome12345 letmein12345 admin1234567 changeme1234 passw0rd1234 football1234 baseball1234 sunshine1234 princess1234 dragon123456 monkey123456 abc123456789 trustno11234 superman1234 starwars1234 qwerty123456 password2024 password2025 password2026 codingincolor teacher12345 student12345 school123456"
    .split(" ")
);

export function checkPassword(password: string, context: { email?: string; name?: string } = {}): string | null {
  if (password.length < 12) return "Use at least 12 characters (a short sentence works well).";
  if (password.length > 200) return "That password is too long.";
  const lower = password.toLowerCase();
  if (COMMON.has(lower) || /^(.)\1+$/.test(password) || /^(0123456789|1234567890|abcdefghijkl)/.test(lower)) {
    return "That password is too common. Pick something only you would use.";
  }
  const local = context.email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 3 && lower.includes(local)) return "Don't include your email in your password.";
  const first = context.name?.split(/\s+/)[0]?.toLowerCase();
  if (first && first.length >= 3 && lower.includes(first)) return "Don't include your name in your password.";
  if (new Set(password).size < 6) return "Use more varied characters.";
  return null;
}
