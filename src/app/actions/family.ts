"use server";
import { revalidatePath } from "next/cache";
import { currentStudent, newToken, sha256 } from "@/lib/auth";
import { q } from "@/lib/db";

/** Creates a new family link (revoking any old one). The raw token is only ever shown to the student. */
export async function createFamilyLink(): Promise<string | null> {
  const s = await currentStudent();
  if (!s) return null;
  await q("UPDATE family_links SET revoked_at = now() WHERE student_id = $1 AND revoked_at IS NULL", [s.id]);
  const token = newToken();
  await q("INSERT INTO family_links (token_hash, student_id) VALUES ($1, $2)", [sha256(token), s.id]);
  revalidatePath("/learn");
  return token;
}

export async function revokeFamilyLinks() {
  const s = await currentStudent();
  if (!s) return;
  await q("UPDATE family_links SET revoked_at = now() WHERE student_id = $1 AND revoked_at IS NULL", [s.id]);
  revalidatePath("/learn");
}
