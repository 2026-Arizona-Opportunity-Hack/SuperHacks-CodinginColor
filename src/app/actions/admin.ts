"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit, requireStaff } from "@/lib/auth";
import { createApiKey } from "@/lib/apikeys";
import { q } from "@/lib/db";

export async function newApiKey(name: string) {
  const user = await requireStaff(["admin"]);
  const n = z.string().trim().min(2).max(60).parse(name);
  const key = await createApiKey(n, user.id);
  await audit(user.email, "api_key_create", n);
  revalidatePath("/admin");
  return key;
}

export async function revokeApiKey(id: string) {
  const user = await requireStaff(["admin"]);
  if (!z.string().uuid().safeParse(id).success) return;
  await q("UPDATE api_keys SET revoked_at = now() WHERE id = $1", [id]);
  await audit(user.email, "api_key_revoke", id);
  revalidatePath("/admin");
}

export async function setUserRole(userId: string, role: string) {
  const user = await requireStaff(["admin"]);
  const r = z.enum(["admin", "instructor", "reviewer"]).parse(role);
  if (!z.string().uuid().safeParse(userId).success || userId === user.id) return; // can't demote yourself
  await q("UPDATE users SET role = $1 WHERE id = $2", [r, userId]);
  await q("DELETE FROM sessions WHERE user_id = $1", [userId]); // new role applies on next sign-in
  await audit(user.email, "role_change", `${userId} → ${r}`);
  revalidatePath("/admin");
}
