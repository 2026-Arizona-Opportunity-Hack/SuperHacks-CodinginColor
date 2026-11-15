import { NextResponse } from "next/server";
import { z } from "zod";
import { currentStudent, rateLimit } from "@/lib/auth";
import { q } from "@/lib/db";
import { activityWithModule, canAccessModule } from "@/lib/progress";
import { socraticHint } from "@/lib/tutor";
import { jsonError, readJson, sameOrigin } from "@/lib/http";
import { getLocale } from "@/i18n/server";
import { languageName } from "@/i18n/config";

const Body = z.object({
  activityId: z.string().uuid(),
  code: z.string().max(20_000),
  failedTest: z.string().max(300).optional(),
  error: z.string().max(2000).optional(),
  question: z.string().max(500).optional(),
});

/** Gives a Socratic hint and logs it as a struggle signal the teacher can review. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError(403, "Bad origin");
  const student = await currentStudent();
  if (!student) return jsonError(401, "Join a class first");
  if (!rateLimit(`hint:${student.id}`, 8, 60_000)) return jsonError(429, "Take a minute to try the last hint first 🙂");
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await readJson(req));
  } catch {
    return jsonError(400, "Invalid request");
  }
  const act = await activityWithModule(body.activityId);
  if (!act || act.kind !== "code" || !(await canAccessModule(student, act.module_id))) return jsonError(403, "Not available");

  const locale = await getLocale();
  const result = await socraticHint({
    prompt: act.content.prompt,
    solution: act.content.solution,
    concept: act.concept,
    code: body.code,
    failedTest: body.failedTest,
    error: body.error,
    question: body.question,
    language: languageName(locale),
  });
  await q("INSERT INTO struggle_events (student_id, activity_id, concept, kind, detail) VALUES ($1, $2, $3, 'hint', $4)", [
    student.id,
    act.id,
    act.concept || result.concept,
    JSON.stringify({ question: body.question ?? "", hint: result.hint, failed: body.failedTest ?? "", source: result.source, detected: result.concept }),
  ]);
  return NextResponse.json({ hint: result.hint, concept: result.concept });
}
