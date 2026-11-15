import { NextResponse } from "next/server";
import { z } from "zod";
import { currentStudent } from "@/lib/auth";
import { q } from "@/lib/db";
import { activityWithModule, canAccessModule } from "@/lib/progress";
import { jsonError, sameOrigin } from "@/lib/http";

/** Marks an activity as "started" so the teacher sees where each student is right now. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return jsonError(403, "Bad origin");
  const student = await currentStudent();
  if (!student) return jsonError(401, "Join a class first");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return jsonError(400, "Bad id");
  const act = await activityWithModule(id);
  if (!act || !(await canAccessModule(student, act.module_id))) return jsonError(403, "Locked");
  await q(
    `INSERT INTO progress (student_id, activity_id, status) VALUES ($1, $2, 'started')
     ON CONFLICT (student_id, activity_id) DO NOTHING`,
    [student.id, id]
  );
  await q("UPDATE students SET last_active = now() WHERE id = $1", [student.id]);
  return NextResponse.json({ ok: true });
}
