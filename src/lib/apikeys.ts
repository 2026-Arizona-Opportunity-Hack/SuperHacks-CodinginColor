import "server-only";
import crypto from "crypto";
import { one, q } from "./db";
import { sha256 } from "./auth";

/** Keys look like cic_live_<32 random chars>. Only the SHA-256 hash is stored; the full key is shown once. */
export async function createApiKey(name: string, userId: string) {
  const secret = crypto.randomBytes(24).toString("base64url");
  const key = `cic_live_${secret}`;
  await q("INSERT INTO api_keys (name, prefix, key_hash, created_by) VALUES ($1, $2, $3, $4)", [name, key.slice(0, 13), sha256(key), userId]);
  return key;
}

export async function verifyApiKey(header: string | null): Promise<{ id: string; name: string } | null> {
  const key = header?.match(/^Bearer\s+(cic_live_[A-Za-z0-9_-]{20,64})$/)?.[1];
  if (!key) return null;
  const row = await one("SELECT id, name FROM api_keys WHERE key_hash = $1 AND revoked_at IS NULL", [sha256(key)]);
  if (row) await q("UPDATE api_keys SET last_used_at = now() WHERE id = $1", [row.id]);
  return row as { id: string; name: string } | null;
}
