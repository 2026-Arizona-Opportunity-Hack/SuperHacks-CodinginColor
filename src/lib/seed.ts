import bcrypt from "bcryptjs";
import type { Db } from "./db";
import { COURSE, MODULES } from "./curriculum-seed";

/**
 * Demo data so the dashboards have something real to show on a fresh install:
 * the starter course, four staff accounts, three cohorts with simulated progress.
 * Disable with SEED_DEMO_DATA=false for a clean production install.
 */

export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "cic-demo-2026";

// Deterministic pseudo-random numbers so every fresh install looks the same.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const FIRST_NAMES = [
  "Ana", "Mateo", "Jayla", "Diego", "Aaliyah", "Kai", "Sofia", "Malik", "Isabella", "Noah", "Ximena", "Darius",
  "Lucia", "Elijah", "Camila", "Jalen", "Valeria", "Andre", "Maya", "Josiah", "Nayeli", "Tariq", "Leilani", "Marcus",
  "Esperanza", "Kiona", "Omar", "Talia", "Santiago", "Imani", "Rafael", "Zuri", "Adrian", "Naomi", "Luis", "Amara",
];

export function resumeCode(rand: () => number = Math.random) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I confusion
  return Array.from({ length: 6 }, () => alphabet[Math.floor(rand() * alphabet.length)]).join("");
}

export async function seed(db: Db) {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const staff = [
    { email: "admin@codingincolor.org", name: "Diana (CIC Admin)", role: "admin", org: "Coding in Color" },
    { email: "instructor@codingincolor.org", name: "Jordan Rivera", role: "instructor", org: "Coding in Color" },
    { email: "teacher@phxunion.org", name: "Ms. Patel", role: "instructor", org: "Phoenix Union HSD" },
    { email: "reviewer@district.org", name: "District Reviewer", role: "reviewer", org: "Phoenix Union HSD" },
  ];
  const ids: Record<string, string> = {};
  for (const s of staff) {
    const [u] = await db.query(
      "INSERT INTO users (email, name, password_hash, role, organization) VALUES ($1,$2,$3,$4,$5) RETURNING id",
      [s.email, s.name, hash, s.role, s.org]
    );
    ids[s.role === "instructor" && s.org !== "Coding in Color" ? "teacher" : s.role] = u.id;
  }

  const [course] = await db.query("INSERT INTO courses (title, description) VALUES ($1,$2) RETURNING id", [
    COURSE.title,
    COURSE.description,
  ]);
  const modules: { id: string; activities: { id: string; kind: string; concept: string; content: any }[] }[] = [];
  for (const [mi, m] of MODULES.entries()) {
    const [mod] = await db.query(
      "INSERT INTO modules (course_id, position, title, summary, concepts) VALUES ($1,$2,$3,$4,$5) RETURNING id",
      [course.id, mi + 1, m.title, m.summary, m.concepts]
    );
    const acts: { id: string; kind: string; concept: string; content: any }[] = [];
    for (const [li, l] of m.lessons.entries()) {
      const [lesson] = await db.query("INSERT INTO lessons (module_id, position, title) VALUES ($1,$2,$3) RETURNING id", [
        mod.id,
        li + 1,
        l.title,
      ]);
      for (const [ai, a] of l.activities.entries()) {
        const [act] = await db.query(
          "INSERT INTO activities (lesson_id, position, kind, title, concept, content) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
          [lesson.id, ai + 1, a.kind, a.title, a.concept, JSON.stringify(a.content)]
        );
        acts.push({ id: act.id, kind: a.kind, concept: a.concept, content: a.content });
      }
    }
    modules.push({ id: mod.id, activities: acts });
  }

  // Three cohorts. `reach` = how many modules most students finished; `stuck` = concept many struggle with.
  const cohorts = [
    { name: "AI Academy · Period 3", school: "Maryvale High School", cohort: "Maryvale Fall 2026", code: "MARY26", size: 14, assigned: 3, reach: 2.3, stuck: "loops", owner: "instructor" },
    { name: "After-school Coding Club", school: "Desert Edge High School", cohort: "Desert Edge Fall 2026", code: "EDGE26", size: 12, assigned: 2, reach: 1.6, stuck: "conditionals", owner: "instructor" },
    { name: "CS Foundations (credit)", school: "Salt River High School", cohort: "Salt River Fall 2026", code: "SALT26", size: 10, assigned: 4, reach: 3.2, stuck: "functions", owner: "teacher" },
  ];
  const rand = rng(42);
  const now = Date.now();
  let nameIdx = 0;
  for (const c of cohorts) {
    const [cls] = await db.query(
      "INSERT INTO classes (name, school, cohort, join_code, instructor_id, course_id, created_at) VALUES ($1,$2,$3,$4,$5,$6, now() - interval '21 days') RETURNING id",
      [c.name, c.school, c.cohort, c.code, ids[c.owner], course.id]
    );
    for (let i = 0; i < c.assigned; i++) {
      await db.query("INSERT INTO class_modules (class_id, module_id) VALUES ($1,$2)", [cls.id, modules[i].id]);
    }
    for (let s = 0; s < c.size; s++) {
      const name = FIRST_NAMES[nameIdx++ % FIRST_NAMES.length] + (nameIdx > FIRST_NAMES.length ? " " + String.fromCharCode(65 + (nameIdx % 26)) + "." : "");
      // The last student in each class joined late and hasn't started: shows up in "not started".
      const late = s === c.size - 1;
      const reach = late ? 0 : Math.max(0, Math.min(c.assigned, c.reach + (rand() - 0.5) * 2.2));
      const lastActive = late ? null : new Date(now - rand() * 3 * 86400_000);
      const [stu] = await db.query(
        "INSERT INTO students (class_id, display_name, roster_id, resume_code, claimed_at, last_active, xp) VALUES ($1,$2,$3,$4,$5,$6,0) RETURNING id",
        [cls.id, name, `S${1000 + nameIdx}`, resumeCode(rand), late ? null : new Date(now - 20 * 86400_000), lastActive]
      );
      let xp = 0;
      for (let mi = 0; mi < c.assigned; mi++) {
        const mod = modules[mi];
        const fraction = Math.max(0, Math.min(1, reach - mi)); // 1 = finished, 0.4 = 40% through
        if (fraction <= 0) break;
        const doneCount = fraction >= 1 ? mod.activities.length : Math.max(1, Math.floor(fraction * mod.activities.length));
        const pre = 15 + rand() * 45;
        for (const [ai, a] of mod.activities.entries()) {
          if (ai >= doneCount) {
            // currently working on this one
            if (ai === doneCount) {
              await db.query(
                "INSERT INTO progress (student_id, activity_id, status, attempts, time_seconds, started_at) VALUES ($1,$2,'started',$3,$4, now() - interval '40 minutes')",
                [stu.id, a.id, a.kind === "code" ? 3 : 1, 600 + Math.floor(rand() * 900)]
              );
            }
            break;
          }
          let score: number | null = null;
          if (a.kind === "pretest") score = Math.round(pre / 25) * 25;
          else if (a.kind === "posttest") score = Math.min(100, Math.round((pre + 12 + rand() * 36) / 25) * 25);
          else if (a.kind === "check" || a.kind === "exit") score = rand() > 0.3 ? 100 : 50;
          else if (a.kind === "code") score = 100;
          await db.query(
            "INSERT INTO progress (student_id, activity_id, status, score, attempts, time_seconds, completed_at) VALUES ($1,$2,'completed',$3,$4,$5, now() - ($6 || ' hours')::interval)",
            [stu.id, a.id, score, a.kind === "code" ? 1 + Math.floor(rand() * 4) : 1, 60 + Math.floor(rand() * 600), String(Math.floor(rand() * 400))]
          );
          xp += a.kind === "code" ? 30 : 10;
        }
        // Struggle signals on the class's hard concept (and a little everywhere else).
        const code = mod.activities.find((a) => a.kind === "code")!;
        const hardHere = MODULES[mi].concepts.includes(c.stuck);
        const fails = hardHere ? 1 + Math.floor(rand() * 4) : rand() > 0.7 ? 1 : 0;
        for (let f = 0; f < fails; f++) {
          await db.query(
            "INSERT INTO struggle_events (student_id, activity_id, concept, kind, detail, created_at) VALUES ($1,$2,$3,'fail',$4, now() - interval '2 days')",
            [stu.id, code.id, code.concept, JSON.stringify({ failed: code.content.tests[f % code.content.tests.length].name })]
          );
        }
        if (hardHere && rand() > 0.35) {
          await db.query(
            "INSERT INTO struggle_events (student_id, activity_id, concept, kind, detail, created_at) VALUES ($1,$2,$3,'hint',$4, now() - interval '2 days')",
            [stu.id, code.id, code.concept, JSON.stringify({ question: "why is my answer wrong?", hint: "What value does your variable have before the loop starts, and does it change each time around?" })]
          );
        }
      }
      await db.query("UPDATE students SET xp = $1 WHERE id = $2", [xp, stu.id]);
    }
  }
  await db.query("INSERT INTO audit_log (actor, action, target) VALUES ('system', 'seed', 'demo data')");
}
