"use server";
import { z } from "zod";
import { audit, currentStudent, rateLimit, requireStaff } from "@/lib/auth";
import { one, q } from "@/lib/db";
import { createProof } from "@/lib/proof";
import { journey } from "@/lib/progress";
import { gainRows, summarize, cohortStats } from "@/lib/stats";

/** A student who finished every assigned module can mint a verifiable certificate (once). */
export async function claimCertificate(): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const s = await currentStudent();
  if (!s) return { ok: false, error: "Join a class first" };
  const existing = await one("SELECT id FROM proofs WHERE kind = 'certificate' AND student_id = $1", [s.id]);
  if (existing) return { ok: true, id: existing.id };
  if (!await rateLimit(`cert:${s.id}`, 3, 60_000)) return { ok: false, error: "Please wait a moment" };
  const j = await journey(s);
  const assigned = j.filter((m) => m.state !== "not_assigned");
  const finished = assigned.filter((m) => m.state === "done" || m.state === "tested_out");
  if (finished.length === 0 || finished.length < assigned.length) return { ok: false, error: "Finish every assigned module first" };
  const cls = await one("SELECT c.name, c.school, co.title AS course FROM classes c JOIN courses co ON co.id = c.course_id WHERE c.id = $1", [s.class_id]);
  const gains = finished.map((m) => m.gain).filter((g): g is number => g != null);
  const payload = {
    type: "CIC Learn certificate of completion",
    issuer: "Coding in Color",
    student: s.display_name,
    school: cls?.school ?? "",
    class: cls?.name ?? "",
    course: cls?.course ?? "",
    modules: finished.map((m) => ({ title: m.title, gain: m.gain })),
    average_learning_gain: gains.length ? Math.round(gains.reduce((a, b) => a + b, 0) / gains.length) : null,
    issued_on: new Date().toISOString().slice(0, 10),
    nonce: crypto.randomUUID(), // makes every certificate's hash unique
  };
  const proof = await createProof("certificate", payload, s.id);
  return { ok: true, id: proof.id };
}

/** Admin: fingerprint the funder report's numbers and anchor them, so funders can verify they weren't edited. */
export async function anchorReport(cohort?: string): Promise<{ id: string; signature: string | null }> {
  const user = await requireStaff(["admin"]);
  const c = z.string().max(80).optional().parse(cohort || undefined);
  const [rows, classes] = await Promise.all([gainRows({ cohort: c }), cohortStats()]);
  const shown = c ? classes.filter((x) => x.cohort === c) : classes;
  const payload = {
    type: "CIC program outcomes report",
    scope: c ?? "All cohorts",
    classes: shown.map((x) => ({ name: x.name, school: x.school, students: x.students, completion_pct: x.completion_pct, learning_gain: x.learning_gain })),
    learning_gain: summarize(rows, () => "all", () => "All").map(({ key, label, ...g }) => g)[0] ?? null,
    by_concept: summarize(rows, (r) => r.concept, (r) => r.concept).map(({ key, ...g }) => g),
    generated_at: new Date().toISOString(),
  };
  const proof = await createProof("report", payload);
  await audit(user.email, "report_anchor", proof.id);
  return { id: proof.id, signature: proof.signature };
}

export async function myCertificate() {
  const s = await currentStudent();
  if (!s) return null;
  return (await q("SELECT id FROM proofs WHERE kind = 'certificate' AND student_id = $1", [s.id]))[0]?.id ?? null;
}
