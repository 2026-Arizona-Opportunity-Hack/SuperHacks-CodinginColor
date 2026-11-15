import { test } from "node:test";
import assert from "node:assert/strict";
import { base32Encode, checkPassword, decrypt, encrypt, hashBackupCode, newBackupCodes, rateLimit, totpAt, verifyTotp } from "@/lib/security";

const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890")); // RFC 6238 SHA-1 test key

test("TOTP matches the RFC 6238 test vectors", () => {
  assert.equal(totpAt(RFC_SECRET, Math.floor(59 / 30)), "287082");
  assert.equal(totpAt(RFC_SECRET, Math.floor(1111111109 / 30)), "081804");
  assert.equal(totpAt(RFC_SECRET, Math.floor(1234567890 / 30)), "005924");
});

test("TOTP accepts ±1 step of clock drift but never the same code twice", () => {
  const now = 1_700_000_000_000;
  const step = Math.floor(now / 30_000);
  assert.equal(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, step), 0, now), step);
  assert.equal(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, step - 1), 0, now), step - 1);
  assert.equal(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, step - 3), 0, now), null);
  assert.equal(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, step), step, now), null, "replay is refused");
  assert.equal(verifyTotp(RFC_SECRET, "12345", 0, now), null);
});

test("secrets are encrypted with AES-GCM and tampering is detected", () => {
  const box = encrypt("JBSWY3DPEHPK3PXP");
  assert.notEqual(box, "JBSWY3DPEHPK3PXP");
  assert.equal(decrypt(box), "JBSWY3DPEHPK3PXP");
  const parts = box.split(".");
  parts[3] = parts[3].slice(0, -2) + (parts[3].endsWith("A") ? "BB" : "AA");
  assert.throws(() => decrypt(parts.join(".")));
});

test("backup codes are random, formatted, and stored only as hashes", () => {
  const { plain, hashes } = newBackupCodes();
  assert.equal(new Set(plain).size, 8);
  assert.match(plain[0], /^[a-z2-7]{4}-[a-z2-7]{4}$/);
  assert.equal(hashBackupCode(plain[0].toUpperCase()), hashes[0]);
  assert.ok(!hashes.some((h) => plain.includes(h)));
});

test("password policy refuses weak passwords", () => {
  assert.match(checkPassword("short")!, /12 characters/);
  assert.match(checkPassword("password2026")!, /common/);
  assert.match(checkPassword("aaaaaaaaaaaaaa")!, /common/);
  assert.match(checkPassword("jordan-loves-python", { email: "jordan@x.org" })!, /email/);
  assert.equal(checkPassword("purple-cactus-sings-at-noon"), null);
});

test("rate limiter is shared through the database", async () => {
  const key = `test:${Math.random()}`;
  const results = [];
  for (let i = 0; i < 4; i++) results.push(await rateLimit(key, 3, 60_000));
  assert.deepEqual(results, [true, true, true, false]);
});
