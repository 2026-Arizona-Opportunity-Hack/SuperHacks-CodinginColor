import { z } from "zod";
import { canManageClass, currentStaff } from "@/lib/auth";
import { one, q } from "@/lib/db";
import { gainRows } from "@/lib/stats";
import { csvCell } from "@/lib/csv";

/** Gradebook export for classes taken for credit: one row per student, one column group per module. */
export async function GET(_req: Request, { params }: { params: Promise<{ classId: string }> }) {
  const user = await currentStaff();
  const { classId } = await params;
  if (!user || !z.string().uuid().safeParse(classId).success || !(await canManageClass(user, classId))) return new Response("Not found", { status: 404 });
  const cls = await one("SELECT name, join_code FROM classes WHERE id = $1", [classId]);
  const modules = await q(
    "SELECT m.id, m.position, m.title FROM class_modules cm JOIN modules m ON m.id = cm.module_id WHERE cm.class_id = $1 ORDER BY m.position",
    [classId]
  );
  const students = await q("SELECT id, display_name, roster_id, xp FROM students WHERE class_id = $1 ORDER BY display_name", [classId]);
  const done = await q(
    `SELECT p.student_id, l.module_id, count(*) FILTER (WHERE p.status = 'completed')::int AS done,
            (SELECT count(*)::int FROM lessons l2 JOIN activities a2 ON a2.lesson_id = l2.id WHERE l2.module_id = l.module_id) AS total
     FROM progress p JOIN activities a ON a.id = p.activity_id JOIN lessons l ON l.id = a.lesson_id
     JOIN students s ON s.id = p.student_id WHERE s.class_id = $1 GROUP BY p.student_id, l.module_id`,
    [classId]
  );
  const gains = await gainRows({ classId });
  const pct = new Map(done.map((d) => [`${d.student_id}:${d.module_id}`, Math.round((100 * d.done) / Math.max(1, d.total))]));
  const g = new Map(gains.map((r) => [`${r.student_id}:${r.module_id}`, r]));

  const header = ["Student", "Roster ID", "XP", ...modules.flatMap((m) => [`M${m.position} complete %`, `M${m.position} pretest`, `M${m.position} posttest`, `M${m.position} gain`])];
  const lines = [header.map(csvCell).join(",")];
  for (const s of students) {
    const row: unknown[] = [s.display_name, s.roster_id, s.xp];
    for (const m of modules) {
      const r = g.get(`${s.id}:${m.id}`);
      row.push(pct.get(`${s.id}:${m.id}`) ?? 0, r?.pre ?? "", r?.post ?? "", r?.pre != null && r?.post != null ? r.post - r.pre : "");
    }
    lines.push(row.map(csvCell).join(","));
  }
  const filename = `gradebook-${String(cls?.join_code ?? "class").replace(/[^A-Z0-9]/gi, "")}.csv`;
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" },
  });
}
