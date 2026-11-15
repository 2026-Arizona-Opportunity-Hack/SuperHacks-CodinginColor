"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { one, q } from "@/lib/db";
import { audit, canManageClass, requireStaff, type StaffUser } from "@/lib/auth";
import { resumeCode } from "@/lib/seed";
import { reteachPlan as buildPlan } from "@/lib/reteach";
import { parseRoster as parseRosterText, type RosterRow } from "@/lib/roster";
export type { RosterRow };

const Uuid = z.string().uuid();

async function guard(classId: string): Promise<StaffUser> {
  const user = await requireStaff(["admin", "instructor"]);
  if (!Uuid.safeParse(classId).success || !(await canManageClass(user, classId))) throw new Error("Not allowed");
  return user;
}

// ── Roster CSV ──

/** Server action wrapper so the new-class form can preview a pasted roster. */
export async function parseRoster(text: string): Promise<{ rows: RosterRow[]; skipped: number }> {
  await requireStaff(["admin", "instructor"]);
  return parseRosterText(String(text).slice(0, 200_000));
}

async function insertRoster(classId: string, rows: RosterRow[]) {
  const existing = new Set((await q("SELECT lower(display_name) AS n FROM students WHERE class_id = $1", [classId])).map((r) => r.n));
  let added = 0;
  for (const r of rows) {
    if (existing.has(r.name.toLowerCase())) continue;
    existing.add(r.name.toLowerCase());
    // Retry on the (very unlikely) resume-code collision.
    for (let i = 0; i < 3; i++) {
      try {
        await q("INSERT INTO students (class_id, display_name, roster_id, resume_code) VALUES ($1,$2,$3,$4)", [classId, r.name, r.rosterId, resumeCode()]);
        added++;
        break;
      } catch {}
    }
  }
  return added;
}

export async function importRoster(classId: string, csv: string) {
  const user = await guard(classId);
  if (csv.length > 200_000) return { ok: false as const, error: "File is too large (max 200 KB)." };
  const { rows, skipped } = parseRosterText(csv);
  const added = await insertRoster(classId, rows);
  await audit(user.email, "roster_import", `${classId}: +${added}`);
  revalidatePath(`/teach/${classId}`);
  return { ok: true as const, added, skipped };
}

// ── Create class ──

function joinCode(name: string) {
  const letters = name.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4).padEnd(4, "X");
  const digits = String(Math.floor(10 + Math.random() * 90));
  return letters + digits;
}

const NewClass = z.object({
  name: z.string().trim().min(2).max(80),
  school: z.string().trim().max(120).default(""),
  cohort: z.string().trim().max(80).default(""),
  modules: z.array(Uuid).max(50),
  roster: z.string().max(200_000).default(""),
});

export async function createClass(input: z.input<typeof NewClass>) {
  const user = await requireStaff(["admin", "instructor"]);
  const data = NewClass.parse(input);
  const course = await one("SELECT id FROM courses ORDER BY created_at LIMIT 1");
  if (!course) throw new Error("No course yet");
  let cls: { id: string } | null = null;
  for (let i = 0; i < 5 && !cls; i++) {
    try {
      [cls] = (await q(
        "INSERT INTO classes (name, school, cohort, join_code, instructor_id, course_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
        [data.name, data.school, data.cohort || `${data.school || user.organization} ${new Date().getFullYear()}`, joinCode(data.name), user.id, course.id]
      )) as { id: string }[];
    } catch {}
  }
  if (!cls) throw new Error("Could not create class");
  for (const m of data.modules) {
    await q("INSERT INTO class_modules (class_id, module_id) SELECT $1, id FROM modules WHERE id = $2 ON CONFLICT DO NOTHING", [cls.id, m]);
  }
  if (data.roster.trim()) await insertRoster(cls.id, parseRosterText(data.roster).rows);
  await audit(user.email, "class_create", cls.id);
  redirect(`/teach/${cls.id}?created=1`);
}

// ── Manage ──

export async function setModuleAssigned(classId: string, moduleId: string, assigned: boolean) {
  const user = await guard(classId);
  if (!Uuid.safeParse(moduleId).success) return;
  if (assigned) await q("INSERT INTO class_modules (class_id, module_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [classId, moduleId]);
  else await q("DELETE FROM class_modules WHERE class_id = $1 AND module_id = $2", [classId, moduleId]);
  await audit(user.email, assigned ? "module_assign" : "module_unassign", `${classId}/${moduleId}`);
  revalidatePath(`/teach/${classId}`);
}

export async function resolveHand(classId: string, studentId: string) {
  await guard(classId);
  await q(
    "UPDATE hand_raises SET resolved_at = now() WHERE student_id = $1 AND resolved_at IS NULL AND student_id IN (SELECT id FROM students WHERE class_id = $2)",
    [studentId, classId]
  );
  revalidatePath(`/teach/${classId}`);
}

/** Lets a student sign in again (e.g. new Chromebook) by releasing their seat. Progress is kept. */
export async function releaseSeat(classId: string, studentId: string) {
  const user = await guard(classId);
  await q("UPDATE students SET token_hash = NULL WHERE id = $1 AND class_id = $2", [studentId, classId]);
  await audit(user.email, "seat_release", studentId);
  revalidatePath(`/teach/${classId}`);
}

export async function removeStudent(classId: string, studentId: string) {
  const user = await guard(classId);
  await q("DELETE FROM students WHERE id = $1 AND class_id = $2", [studentId, classId]);
  await audit(user.email, "student_remove", studentId);
  revalidatePath(`/teach/${classId}`);
}

export async function reteachPlan(classId: string, concept: string) {
  await guard(classId);
  return buildPlan(classId, z.string().trim().max(40).parse(concept));
}
