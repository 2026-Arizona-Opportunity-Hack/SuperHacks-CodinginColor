import "server-only";
import { q } from "./db";
import type { Student } from "./auth";

/**
 * Unlock rules (the heart of "the platform teaches"):
 *  - A module is open when the instructor assigned it AND the previous module is done (or tested out).
 *  - Inside a module, activities unlock one at a time, in order.
 */

export type ModuleState = "done" | "tested_out" | "current" | "locked" | "not_assigned";
export type JourneyModule = {
  id: string;
  position: number;
  title: string;
  summary: string;
  concepts: string[];
  total: number;
  completed: number;
  state: ModuleState;
  gain: number | null;
};

export async function journey(student: Student): Promise<JourneyModule[]> {
  const rows = await q(
    `SELECT m.id, m.position, m.title, m.summary, m.concepts,
            (cm.module_id IS NOT NULL) AS assigned,
            (pl.module_id IS NOT NULL) AS tested_out,
            count(a.id)::int AS total,
            count(p.activity_id) FILTER (WHERE p.status = 'completed')::int AS completed,
            max(p.score) FILTER (WHERE a.kind = 'pretest' AND p.status = 'completed')::float AS pre,
            max(p.score) FILTER (WHERE a.kind = 'posttest' AND p.status = 'completed')::float AS post
     FROM classes c
     JOIN modules m ON m.course_id = c.course_id AND m.published
     LEFT JOIN class_modules cm ON cm.class_id = c.id AND cm.module_id = m.id
     LEFT JOIN placements pl ON pl.module_id = m.id AND pl.student_id = $2
     LEFT JOIN lessons l ON l.module_id = m.id
     LEFT JOIN activities a ON a.lesson_id = l.id
     LEFT JOIN progress p ON p.activity_id = a.id AND p.student_id = $2
     WHERE c.id = $1
     GROUP BY m.id, m.position, m.title, m.summary, m.concepts, cm.module_id, pl.module_id
     ORDER BY m.position`,
    [student.class_id, student.id]
  );
  let previousDone = true;
  return rows.map((r) => {
    const done = r.total > 0 && r.completed >= r.total;
    let state: ModuleState;
    if (r.tested_out && !done) state = "tested_out";
    else if (done) state = "done";
    else if (!r.assigned) state = "not_assigned";
    else if (previousDone) state = "current";
    else state = "locked";
    previousDone = state === "done" || state === "tested_out";
    return {
      id: r.id,
      position: r.position,
      title: r.title,
      summary: r.summary,
      concepts: r.concepts ?? [],
      total: r.total,
      completed: r.completed,
      state,
      gain: r.pre != null && r.post != null ? Math.round(r.post - r.pre) : null,
    };
  });
}

/** A module's activities in order, with this student's progress, and whether each is open yet. */
export type ModuleActivityRow = {
  id: string;
  kind: string;
  title: string;
  concept: string;
  content: any;
  lesson: string;
  status: string | null;
  score: number | null;
  answer: any;
  attempts: number | null;
};

export async function moduleActivities(studentId: string, moduleId: string) {
  const rows = await q<ModuleActivityRow>(
    `SELECT a.id, a.kind, a.title, a.concept, a.content, l.title AS lesson, l.position AS lpos, a.position AS apos,
            p.status, p.score::float AS score, p.answer, p.attempts
     FROM lessons l JOIN activities a ON a.lesson_id = l.id
     LEFT JOIN progress p ON p.activity_id = a.id AND p.student_id = $2
     WHERE l.module_id = $1
     ORDER BY l.position, a.position`,
    [moduleId, studentId]
  );
  let open = true;
  return rows.map((r) => {
    const item = { ...r, completed: r.status === "completed", open };
    if (!item.completed) open = false;
    return item;
  });
}

/** Is this module open for the student right now? Used to guard every submission. */
export async function canAccessModule(student: Student, moduleId: string) {
  const j = await journey(student);
  const m = j.find((x) => x.id === moduleId);
  return !!m && (m.state === "current" || m.state === "done" || m.state === "tested_out");
}

export async function activityWithModule(activityId: string) {
  const rows = await q(
    `SELECT a.*, l.module_id FROM activities a JOIN lessons l ON l.id = a.lesson_id WHERE a.id = $1`,
    [activityId]
  );
  return rows[0] ?? null;
}

/** Streak = consecutive days (ending today or yesterday) with a completed activity. */
export async function streakDays(studentId: string) {
  const days = await q<{ d: string }>(
    `SELECT DISTINCT to_char(completed_at AT TIME ZONE 'America/Phoenix', 'YYYY-MM-DD') AS d
     FROM progress WHERE student_id = $1 AND completed_at IS NOT NULL ORDER BY d DESC LIMIT 60`,
    [studentId]
  );
  const set = new Set(days.map((x) => x.d));
  const fmt = (t: number) => new Date(t).toLocaleDateString("en-CA", { timeZone: "America/Phoenix" });
  let t = Date.now();
  if (!set.has(fmt(t))) t -= 86400_000;
  let streak = 0;
  while (set.has(fmt(t))) {
    streak++;
    t -= 86400_000;
  }
  return streak;
}

export const BADGES = [
  { id: "first-steps", emoji: "👣", label: "First steps", test: (s: { completed: number }) => s.completed >= 1 },
  { id: "module-1", emoji: "🧩", label: "Module master", test: (s: { modulesDone: number }) => s.modulesDone >= 1 },
  { id: "coder", emoji: "🐍", label: "Python coder", test: (s: { codePassed: number }) => s.codePassed >= 1 },
  { id: "persistent", emoji: "💪", label: "Never gave up", test: (s: { retriedThenPassed: boolean }) => s.retriedThenPassed },
  { id: "streak-3", emoji: "🔥", label: "3-day streak", test: (s: { streak: number }) => s.streak >= 3 },
  { id: "grower", emoji: "📈", label: "+25 learning gain", test: (s: { bestGain: number }) => s.bestGain >= 25 },
] as const;

/**
 * Saves one submission. Returns whether THIS call is the one that completed the activity:
 * completed_at is set once (coalesce), so it equals this transaction's now() only for the
 * first completing write. Concurrent or repeated submissions can't award XP twice.
 */
export async function saveProgress(
  studentId: string,
  activityId: string,
  p: { completed: boolean; score: number | null; keepBest: number | null; answer: unknown; seconds: number }
): Promise<{ newlyCompleted: boolean }> {
  const [row] = await q<{ newly: boolean }>(
    `INSERT INTO progress (student_id, activity_id, status, score, answer, attempts, time_seconds, completed_at)
     VALUES ($1, $2, $3, $4, $5, 1, $6, CASE WHEN $3 = 'completed' THEN now() END)
     ON CONFLICT (student_id, activity_id) DO UPDATE SET
       status = CASE WHEN progress.status = 'completed' THEN 'completed' ELSE EXCLUDED.status END,
       score = $7, answer = coalesce(EXCLUDED.answer, progress.answer),
       attempts = progress.attempts + 1, time_seconds = progress.time_seconds + EXCLUDED.time_seconds,
       completed_at = coalesce(progress.completed_at, EXCLUDED.completed_at)
     RETURNING (completed_at IS NOT NULL AND completed_at = now()) AS newly`,
    [studentId, activityId, p.completed ? "completed" : "started", p.score, p.answer == null ? null : JSON.stringify(p.answer), p.seconds, p.keepBest]
  );
  return { newlyCompleted: p.completed && row?.newly === true };
}
