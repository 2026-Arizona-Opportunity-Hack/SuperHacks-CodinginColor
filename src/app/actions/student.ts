"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { currentStudent } from "@/lib/auth";
import { q } from "@/lib/db";

export async function setLeaderboardVisibility(hidden: boolean) {
  const s = await currentStudent();
  if (!s) return;
  await q("UPDATE students SET hide_from_leaderboard = $1 WHERE id = $2", [hidden === true, s.id]);
  revalidatePath("/learn");
}

/** "Raise hand": shows up live on the teacher's dashboard until they resolve it. */
export async function raiseHand(activityId?: string) {
  const s = await currentStudent();
  if (!s) return { ok: false };
  const act = activityId && z.string().uuid().safeParse(activityId).success ? activityId : null;
  const open = await q("SELECT 1 FROM hand_raises WHERE student_id = $1 AND resolved_at IS NULL", [s.id]);
  if (open.length === 0) await q("INSERT INTO hand_raises (student_id, activity_id) VALUES ($1, $2)", [s.id, act]);
  return { ok: true };
}
