"use server";
import { z } from "zod";
import { currentStudent } from "@/lib/auth";
import { q } from "@/lib/db";
import { gradeQuiz, type Question } from "@/lib/content";
import { journey } from "@/lib/progress";

/**
 * Catch-up check for late joiners: two questions from each earlier assigned module's pretest.
 * Score 75%+ on a module → it's marked "tested out" and the next one opens.
 */
export async function placementQuestions() {
  const s = await currentStudent();
  if (!s) return [];
  const j = await journey(s);
  const assigned = j.filter((m) => m.state !== "not_assigned");
  const candidates = assigned.slice(0, -1); // never skip the module the class is on now
  const out: { moduleId: string; title: string; questions: Question[] }[] = [];
  for (const m of candidates) {
    const [row] = await q(
      `SELECT a.content FROM activities a JOIN lessons l ON l.id = a.lesson_id WHERE l.module_id = $1 AND a.kind = 'pretest' LIMIT 1`,
      [m.id]
    );
    if (row) out.push({ moduleId: m.id, title: m.title, questions: (row.content.questions as Question[]).slice(0, 2) });
  }
  return out;
}

const Answers = z.record(z.string().max(80), z.number().int().min(0).max(10));

export async function submitPlacement(raw: unknown) {
  const s = await currentStudent();
  if (!s) return { ok: false as const };
  const answers = Answers.parse(raw);
  const sets = await placementQuestions();
  const results: { title: string; score: number; skipped: boolean }[] = [];
  for (const set of sets) {
    const mine = Object.fromEntries(set.questions.map((qq) => [qq.id, answers[`${set.moduleId}:${qq.id}`] ?? -1]));
    const { score } = gradeQuiz({ questions: set.questions }, mine);
    const skipped = score >= 75;
    if (skipped) {
      await q("INSERT INTO placements (student_id, module_id, score) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", [s.id, set.moduleId, score]);
    } else break; // stop at the first module they still need
    results.push({ title: set.title, score, skipped });
  }
  return { ok: true as const, results };
}
