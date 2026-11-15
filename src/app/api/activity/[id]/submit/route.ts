import { NextResponse } from "next/server";
import { z } from "zod";
import { currentStudent, rateLimit } from "@/lib/auth";
import { one, q } from "@/lib/db";
import { gradeQuiz, isQuiz } from "@/lib/content";
import { activityWithModule, canAccessModule, moduleActivities, saveProgress } from "@/lib/progress";
import { jsonError, readJson, sameOrigin } from "@/lib/http";

const Body = z.object({
  seconds: z.number().int().min(0).max(36_000).default(0),
  answers: z.record(z.string().max(40), z.number().int().min(0).max(10)).optional(), // quizzes
  responses: z.record(z.string().max(40), z.string().max(4000)).optional(), // worksheets
  code: z.string().max(20_000).optional(), // code activities
  passed: z.boolean().optional(),
  failedTest: z.string().max(200).optional(),
  error: z.string().max(2000).optional(),
});

/**
 * Records a student's work on one activity. Quizzes are graded here, on the server, against
 * answer keys the browser never sees. Python runs in the student's browser (no server
 * sandbox needed); its pass/fail result and the code are recorded for the teacher.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return jsonError(403, "Bad origin");
  const student = await currentStudent();
  if (!student) return jsonError(401, "Join a class first");
  if (!await rateLimit(`submit:${student.id}`, 60, 60_000)) return jsonError(429, "Slow down a little");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return jsonError(400, "Bad id");

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await readJson(req));
  } catch {
    return jsonError(400, "Invalid submission");
  }

  const act = await activityWithModule(id);
  if (!act || !(await canAccessModule(student, act.module_id))) return jsonError(403, "This module is locked");
  const list = await moduleActivities(student.id, act.module_id);
  const me = list.find((a) => a.id === id);
  if (!me?.open) return jsonError(403, "Finish the earlier steps first");

  const prev = await one("SELECT status, score::float AS score, attempts FROM progress WHERE student_id = $1 AND activity_id = $2", [student.id, id]);
  const alreadyDone = prev?.status === "completed";
  const seconds = Math.min(body.seconds, 3600);
  let completed = false;
  let score: number | null = null;
  let answer: unknown = null;
  let result: unknown = null;

  if (isQuiz(act.kind)) {
    if (!body.answers) return jsonError(400, "Answer the questions first");
    const content = act.content as { questions: any[] };
    if (content.questions.some((qq) => body.answers![qq.id] === undefined)) return jsonError(400, "Answer every question");
    // Pre/post tests count once: the first attempt is the measurement.
    if ((act.kind === "pretest" || act.kind === "posttest") && alreadyDone) {
      return NextResponse.json({ alreadyDone: true, score: prev.score, ...(await afterSubmit(student.id, act.module_id, id)) });
    }
    const graded = gradeQuiz(content, body.answers);
    score = graded.score;
    answer = body.answers;
    completed = true;
    // Pre/post tests share questions: return only the score so answers can't leak into the posttest.
    result = act.kind === "pretest" || act.kind === "posttest" ? { score } : graded;
  } else if (act.kind === "worksheet") {
    const prompts = (act.content as { prompts: { id: string }[] }).prompts;
    const responses = body.responses ?? {};
    if (prompts.some((p) => !responses[p.id]?.trim())) return jsonError(400, "Answer every question to submit");
    answer = responses;
    completed = true;
  } else if (act.kind === "code") {
    if (typeof body.code !== "string") return jsonError(400, "Missing code");
    answer = { code: body.code };
    completed = body.passed === true;
    score = completed ? 100 : null;
    await q("INSERT INTO struggle_events (student_id, activity_id, concept, kind, detail) VALUES ($1,$2,$3,$4,$5)", [
      student.id,
      id,
      act.concept,
      completed ? "pass" : "fail",
      JSON.stringify(completed ? {} : { failed: body.failedTest ?? "", error: (body.error ?? "").slice(0, 500) }),
    ]);
  } else {
    completed = true; // video, slides
  }

  const keepBest = prev?.score != null && score != null ? Math.max(Number(prev.score), score) : (score ?? prev?.score ?? null);
  const { newlyCompleted } = await saveProgress(student.id, id, { completed, score, keepBest, answer, seconds });

  let xpGained = 0;
  // XP only for the write that actually completed the activity (exactly once, even under double-submits).
  if (newlyCompleted) {
    xpGained = act.kind === "code" ? 30 : isQuiz(act.kind) && score === 100 ? 15 : 10;
    await q("UPDATE students SET xp = xp + $1, last_active = now() WHERE id = $2", [xpGained, student.id]);
  }
  if (completed) await q("UPDATE hand_raises SET resolved_at = now() WHERE student_id = $1 AND activity_id = $2 AND resolved_at IS NULL", [student.id, id]);

  return NextResponse.json({ completed, score, result, xpGained, ...(await afterSubmit(student.id, act.module_id, id)) });
}

async function afterSubmit(studentId: string, moduleId: string, activityId: string) {
  const list = await moduleActivities(studentId, moduleId);
  const idx = list.findIndex((a) => a.id === activityId);
  const next = list.slice(idx + 1).find((a) => !a.completed) ?? null;
  const moduleComplete = list.every((a) => a.completed);
  let gain: number | null = null;
  if (moduleComplete) {
    const pre = list.find((a) => a.kind === "pretest")?.score;
    const post = list.find((a) => a.kind === "posttest")?.score;
    if (pre != null && post != null) gain = Math.round(post - pre);
  }
  return { nextActivityId: next?.id ?? null, moduleComplete, gain };
}
