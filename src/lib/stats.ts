import "server-only";
import { q } from "./db";

/**
 * All the numbers CIC reports on. Learning gain = posttest score − pretest score (0–100 scale)
 * for the same student and module; only students who took both count.
 */

export type GainRow = {
  student_id: string;
  display_name: string;
  class_id: string;
  class_name: string;
  school: string;
  cohort: string;
  module_id: string;
  module_title: string;
  module_position: number;
  concept: string;
  pre: number | null;
  post: number | null;
};

export async function gainRows(filter: { classId?: string; cohort?: string; instructorId?: string } = {}): Promise<GainRow[]> {
  const rows = await q<GainRow>(
    `WITH ap AS (
       SELECT p.student_id, l.module_id, a.kind, p.score::float AS score
       FROM progress p JOIN activities a ON a.id = p.activity_id JOIN lessons l ON l.id = a.lesson_id
       WHERE a.kind IN ('pretest', 'posttest') AND p.status = 'completed'
     )
     SELECT s.id AS student_id, s.display_name, c.id AS class_id, c.name AS class_name, c.school, c.cohort,
            m.id AS module_id, m.title AS module_title, m.position AS module_position, coalesce(m.concepts[1], '') AS concept,
            max(ap.score) FILTER (WHERE ap.kind = 'pretest')  AS pre,
            max(ap.score) FILTER (WHERE ap.kind = 'posttest') AS post
     FROM ap
     JOIN students s ON s.id = ap.student_id
     JOIN classes c ON c.id = s.class_id
     JOIN modules m ON m.id = ap.module_id
     WHERE ($1::uuid IS NULL OR c.id = $1) AND ($2::text IS NULL OR c.cohort = $2) AND ($3::uuid IS NULL OR c.instructor_id = $3)
     GROUP BY s.id, s.display_name, c.id, c.name, c.school, c.cohort, m.id, m.title, m.position, m.concepts`,
    [filter.classId ?? null, filter.cohort ?? null, filter.instructorId ?? null]
  );
  return rows.map((r) => ({ ...r, pre: r.pre == null ? null : Number(r.pre), post: r.post == null ? null : Number(r.post) }));
}

export type GainSummary = { key: string; label: string; pre: number; post: number; gain: number; n: number };

/** Groups rows (only those with both pre and post) and averages them. */
export function summarize(rows: GainRow[], keyOf: (r: GainRow) => string, labelOf: (r: GainRow) => string): GainSummary[] {
  const groups = new Map<string, { label: string; pre: number; post: number; n: number }>();
  for (const r of rows) {
    if (r.pre == null || r.post == null) continue;
    const k = keyOf(r);
    const g = groups.get(k) ?? { label: labelOf(r), pre: 0, post: 0, n: 0 };
    g.pre += r.pre;
    g.post += r.post;
    g.n++;
    groups.set(k, g);
  }
  return [...groups.entries()]
    .map(([key, g]) => ({
      key,
      label: g.label,
      pre: round1(g.pre / g.n),
      post: round1(g.post / g.n),
      gain: round1((g.post - g.pre) / g.n),
      n: g.n,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

const round1 = (x: number) => Math.round(x * 10) / 10;

export async function learningGain(filter: { concept?: string; classId?: string; cohort?: string } = {}) {
  const rows = (await gainRows(filter)).filter((r) => !filter.concept || r.concept === filter.concept);
  return summarize(rows, () => "all", () => "All");
}

// ── Class roster status ──

export type RosterStudent = {
  id: string;
  display_name: string;
  roster_id: string;
  resume_code: string;
  claimed: boolean;
  last_active: string | null;
  xp: number;
  completed: number;
  total: number;
  current: { module: string; activity: string; minutes: number; attempts: number } | null;
  struggles: Record<string, number>; // concept → fail + hint count (last 14 days)
  hints: number;
  handRaised: boolean;
  status: "not_started" | "stuck" | "on_track" | "done";
};

export async function classRoster(classId: string): Promise<RosterStudent[]> {
  const [students, totals, current, struggles, hands] = await Promise.all([
    q(`SELECT s.id, s.display_name, s.roster_id, s.resume_code, s.claimed_at IS NOT NULL AS claimed, s.last_active, s.xp,
              (SELECT count(*)::int FROM progress p WHERE p.student_id = s.id AND p.status = 'completed') AS completed
       FROM students s WHERE s.class_id = $1 ORDER BY s.display_name`, [classId]),
    q<{ n: number }>(
      `SELECT count(*)::int AS n FROM class_modules cm JOIN lessons l ON l.module_id = cm.module_id JOIN activities a ON a.lesson_id = l.id
       WHERE cm.class_id = $1`, [classId]),
    q(`SELECT DISTINCT ON (p.student_id) p.student_id, m.title AS module, a.title AS activity, p.time_seconds, p.attempts
       FROM progress p JOIN activities a ON a.id = p.activity_id JOIN lessons l ON l.id = a.lesson_id JOIN modules m ON m.id = l.module_id
       JOIN students s ON s.id = p.student_id
       WHERE s.class_id = $1 AND p.status = 'started'
       ORDER BY p.student_id, p.started_at DESC`, [classId]),
    q(`SELECT e.student_id, e.concept, count(*)::int AS n, count(*) FILTER (WHERE e.kind = 'hint')::int AS hints
       FROM struggle_events e JOIN students s ON s.id = e.student_id
       WHERE s.class_id = $1 AND e.kind IN ('fail', 'hint') AND e.created_at > now() - interval '14 days'
       GROUP BY e.student_id, e.concept`, [classId]),
    q(`SELECT DISTINCT h.student_id FROM hand_raises h JOIN students s ON s.id = h.student_id
       WHERE s.class_id = $1 AND h.resolved_at IS NULL`, [classId]),
  ]);
  const total = totals[0]?.n ?? 0;
  const cur = new Map(current.map((c) => [c.student_id, c]));
  const raised = new Set(hands.map((h) => h.student_id));
  const strug = new Map<string, { by: Record<string, number>; hints: number }>();
  for (const s of struggles) {
    const e = strug.get(s.student_id) ?? { by: {}, hints: 0 };
    e.by[s.concept || "general"] = s.n;
    e.hints += s.hints;
    strug.set(s.student_id, e);
  }
  return students.map((s) => {
    const c = cur.get(s.id);
    const st = strug.get(s.id);
    const minutes = c ? Math.round(c.time_seconds / 60) : 0;
    let status: RosterStudent["status"] = "on_track";
    if (s.completed === 0 && !c) status = "not_started";
    else if (total > 0 && s.completed >= total) status = "done";
    else if (raised.has(s.id) || (c && (minutes >= 15 || c.attempts >= 3))) status = "stuck";
    return {
      id: s.id,
      display_name: s.display_name,
      roster_id: s.roster_id,
      resume_code: s.resume_code,
      claimed: s.claimed,
      last_active: s.last_active ? new Date(s.last_active).toISOString() : null,
      xp: s.xp,
      completed: s.completed,
      total,
      current: c ? { module: c.module, activity: c.activity, minutes, attempts: c.attempts } : null,
      struggles: st?.by ?? {},
      hints: st?.hints ?? 0,
      handRaised: raised.has(s.id),
      status,
    };
  });
}

/** Concept mastery: share of the class that struggled (2+ failed runs or a hint) on each concept. */
export function conceptHeat(roster: RosterStudent[]) {
  const by = new Map<string, number>();
  for (const s of roster) for (const [concept, n] of Object.entries(s.struggles)) if (n >= 2) by.set(concept, (by.get(concept) ?? 0) + 1);
  const size = Math.max(1, roster.length);
  return [...by.entries()]
    .map(([concept, count]) => ({ concept, count, pct: Math.round((100 * count) / size) }))
    .sort((a, b) => b.count - a.count);
}

// ── Org-wide (admin + read API) ──

export async function cohortStats() {
  const classes = await q(
    `SELECT c.id, c.name, c.school, c.cohort, c.join_code, u.name AS instructor, u.organization,
            (SELECT count(*)::int FROM students s WHERE s.class_id = c.id) AS students,
            (SELECT count(*)::int FROM class_modules cm WHERE cm.class_id = c.id) AS modules_assigned,
            (SELECT count(*)::int FROM class_modules cm JOIN lessons l ON l.module_id = cm.module_id JOIN activities a ON a.lesson_id = l.id WHERE cm.class_id = c.id) AS activities_assigned,
            (SELECT count(*)::int FROM progress p JOIN students s ON s.id = p.student_id WHERE s.class_id = c.id AND p.status = 'completed') AS activities_completed,
            (SELECT count(*)::int FROM students s WHERE s.class_id = c.id AND s.last_active > now() - interval '7 days') AS active_7d
     FROM classes c JOIN users u ON u.id = c.instructor_id ORDER BY c.cohort, c.name`
  );
  const rows = await gainRows();
  const byClass = new Map(summarize(rows, (r) => r.class_id, (r) => r.class_name).map((g) => [g.key, g]));
  return classes.map((c) => {
    const possible = c.students * c.activities_assigned;
    const g = byClass.get(c.id);
    return {
      id: c.id as string,
      name: c.name as string,
      school: c.school as string,
      cohort: c.cohort as string,
      instructor: c.instructor as string,
      organization: c.organization as string,
      students: c.students as number,
      active_7d: c.active_7d as number,
      modules_assigned: c.modules_assigned as number,
      completion_pct: possible ? Math.round((100 * c.activities_completed) / possible) : 0,
      learning_gain: g ? { pre: g.pre, post: g.post, gain: g.gain, n: g.n } : null,
    };
  });
}
