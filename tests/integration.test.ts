import { test, before } from "node:test";
import assert from "node:assert/strict";
import { db, q, one } from "@/lib/db";
import { journey, moduleActivities, saveProgress } from "@/lib/progress";
import { classRoster, conceptHeat, learningGain } from "@/lib/stats";
import type { Student } from "@/lib/auth";

// Runs against a throwaway in-memory Postgres (PGlite) seeded with the demo data.
before(async () => {
  await db();
});

test("demo data seeds staff, curriculum and three cohorts", async () => {
  const [{ users }] = await q("SELECT count(*)::int AS users FROM users");
  const [{ classes }] = await q("SELECT count(*)::int AS classes FROM classes");
  const [{ modules }] = await q("SELECT count(*)::int AS modules FROM modules");
  assert.equal(users, 4);
  assert.equal(classes, 3);
  assert.equal(modules, 4);
});

test("a brand-new student can open only the first assigned module", async () => {
  const cls = await one("SELECT id FROM classes WHERE join_code = 'MARY26'");
  const [s] = await q("INSERT INTO students (class_id, display_name, resume_code) VALUES ($1, 'Unit', 'UNIT01') RETURNING id, class_id, display_name, resume_code, xp", [cls!.id]);
  const j = await journey(s as Student);
  assert.deepEqual(j.map((m) => m.state), ["current", "locked", "locked", "not_assigned"]);
  const acts = await moduleActivities(s.id, j[0].id);
  assert.equal(acts[0].kind, "pretest");
  assert.deepEqual(acts.map((a) => a.open), [true, false, false, false, false, false, false, false]);
});

test("finishing a module unlocks the next one", async () => {
  const s = (await one("SELECT id, class_id, display_name, resume_code, xp FROM students WHERE resume_code = 'UNIT01'")) as Student;
  const j = await journey(s);
  const acts = await moduleActivities(s.id, j[0].id);
  for (const a of acts) await q("INSERT INTO progress (student_id, activity_id, status, score, completed_at) VALUES ($1, $2, 'completed', 100, now())", [s.id, a.id]);
  const after = await journey(s);
  assert.equal(after[0].state, "done");
  assert.equal(after[1].state, "current");
});

test("struggle signals surface the class's hard concept", async () => {
  const cls = await one("SELECT id FROM classes WHERE join_code = 'MARY26'");
  const heat = conceptHeat(await classRoster(cls!.id));
  assert.equal(heat[0].concept, "loops");
});

test("learning gain is positive for the seeded cohorts", async () => {
  const [g] = await learningGain();
  assert.ok(g.gain > 0 && g.n > 10);
});

test("a completion counts once: repeated and simultaneous submits don't re-award XP", async () => {
  const cls = await one("SELECT id FROM classes WHERE join_code = 'MARY26'");
  const [s] = await q("INSERT INTO students (class_id, display_name, resume_code) VALUES ($1, 'Xp', 'XPXP01') RETURNING id", [cls!.id]);
  const act = await one("SELECT a.id FROM activities a JOIN lessons l ON l.id = a.lesson_id WHERE a.kind = 'code' LIMIT 1");
  const save = (completed: boolean) => saveProgress(s.id, act!.id, { completed, score: completed ? 100 : null, keepBest: completed ? 100 : null, answer: { code: "x" }, seconds: 5 });
  assert.equal((await save(false)).newlyCompleted, false); // a failed attempt
  const both = await Promise.all([save(true), save(true)]); // double-click / retry storm
  assert.equal(both.filter((r) => r.newlyCompleted).length, 1);
  assert.equal((await save(true)).newlyCompleted, false); // later resubmits
  const row = await one("SELECT status, attempts FROM progress WHERE student_id = $1 AND activity_id = $2", [s.id, act!.id]);
  assert.equal(row!.status, "completed");
  assert.equal(row!.attempts, 4);
});
