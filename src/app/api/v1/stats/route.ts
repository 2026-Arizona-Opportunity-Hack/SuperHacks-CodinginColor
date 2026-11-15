import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/auth";
import { verifyApiKey } from "@/lib/apikeys";
import { cohortStats, gainRows, summarize } from "@/lib/stats";
import { q } from "@/lib/db";

/**
 * Read API for CIC's org dashboard. GET with `Authorization: Bearer cic_live_...`.
 * Returns aggregates only: no student names, no resume codes, no individual answers.
 */
export async function GET(req: Request) {
  const key = await verifyApiKey(req.headers.get("authorization"));
  if (!key) return NextResponse.json({ error: "Missing or invalid API key" }, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
  if (!rateLimit(`api:${key.id}`, 60, 60_000)) return NextResponse.json({ error: "Rate limit: 60 requests per minute" }, { status: 429 });

  const url = new URL(req.url);
  const cohort = url.searchParams.get("cohort")?.slice(0, 80) || undefined;
  const [classes, rows, totals] = await Promise.all([
    cohortStats(),
    gainRows({ cohort }),
    q(`SELECT (SELECT count(*)::int FROM students) AS students,
              (SELECT count(*)::int FROM students WHERE last_active > now() - interval '7 days') AS active_7d,
              (SELECT count(*)::int FROM progress WHERE status = 'completed') AS activities_completed,
              (SELECT count(*)::int FROM struggle_events WHERE kind = 'hint') AS hints_given`),
  ]);
  const filtered = cohort ? classes.filter((c) => c.cohort === cohort) : classes;
  return NextResponse.json(
    {
      generated_at: new Date().toISOString(),
      definition: "learning_gain = mean(posttest score − pretest score), 0–100 scale, students who took both",
      totals: totals[0],
      learning_gain: {
        overall: summarize(rows, () => "all", () => "All").map(({ key, label, ...g }) => g)[0] ?? null,
        by_cohort: summarize(rows, (r) => r.cohort, (r) => r.cohort).map(({ key, ...g }) => g),
        by_concept: summarize(rows, (r) => r.concept, (r) => r.concept).map(({ key, ...g }) => g),
        by_module: summarize(rows, (r) => r.module_id, (r) => r.module_title).map(({ key, ...g }) => g),
      },
      classes: filtered.map(({ id, ...c }) => ({ id, ...c })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
