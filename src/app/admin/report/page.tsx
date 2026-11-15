import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { q } from "@/lib/db";
import { cohortStats, gainRows, summarize } from "@/lib/stats";
import { GainChart } from "@/components/GainChart";
import { Logo } from "@/components/Logo";
import { PrintButton } from "@/app/teach/[classId]/codes/PrintButton";
import { ReportProof } from "./ReportProof";

export const metadata: Metadata = { title: "Funder report" };

/** One printable page a grant writer can attach as-is. Numbers come straight from the database. */
export default async function ReportPage({ searchParams }: { searchParams: Promise<{ cohort?: string }> }) {
  await requireStaff(["admin"]);
  const { cohort } = await searchParams;
  const [rows, classes, totals] = await Promise.all([
    gainRows({ cohort: cohort?.slice(0, 80) }),
    cohortStats(),
    q(`SELECT (SELECT count(*)::int FROM students) AS students, (SELECT count(*)::int FROM progress WHERE status='completed') AS done,
              (SELECT coalesce(sum(time_seconds), 0)::int FROM progress) AS seconds, (SELECT count(*)::int FROM struggle_events WHERE kind='hint') AS hints`),
  ]);
  const shown = cohort ? classes.filter((c) => c.cohort === cohort) : classes;
  const overall = summarize(rows, () => "all", () => "All")[0];
  const byConcept = summarize(rows, (r) => r.concept, (r) => r.concept).sort((a, b) => b.gain - a.gain);
  const best = byConcept[0];
  const t = totals[0];
  const students = cohort ? shown.reduce((n, c) => n + c.students, 0) : t.students;
  const generated = new Date();

  const summary = {
    scope: cohort ?? "All cohorts",
    students,
    classes: shown.length,
    learning_gain: overall ?? null,
    by_concept: byConcept.map(({ key, ...g }) => g),
    generated_at: generated.toISOString().slice(0, 10),
  };

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <div className="no-print flex items-center justify-between gap-3">
        <form className="flex items-center gap-2 text-sm">
          <label htmlFor="cohort" className="text-muted">Cohort</label>
          <select id="cohort" name="cohort" defaultValue={cohort ?? ""} className="rounded-lg border border-line bg-surface px-2 py-1.5">
            <option value="">All cohorts</option>
            {[...new Set(classes.map((c) => c.cohort))].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="btn-ghost !min-h-[36px]">Apply</button>
        </form>
        <PrintButton />
      </div>

      <header className="flex items-center gap-4 border-b border-line pb-5">
        <Logo className="h-12 w-12" />
        <div>
          <p className="text-sm font-semibold text-brand">Coding in Color · Program outcomes</p>
          <h1 className="h-display text-3xl">{cohort ?? "All cohorts"}: what students learned</h1>
          <p className="text-sm text-muted">Generated {generated.toLocaleDateString("en-US", { dateStyle: "long" })} from live platform data</p>
        </div>
      </header>

      <section className="rounded-3xl bg-gradient-to-br from-brand to-accent p-8 text-white">
        <p className="text-sm font-semibold opacity-90">Headline</p>
        <p className="h-display mt-2 text-3xl leading-tight sm:text-4xl">
          {best ? <>Students gained <span className="underline decoration-4 underline-offset-4">{best.gain} points</span> on {best.label}.</> : "Learning gain appears once students complete a pre- and post-test."}
        </p>
        {overall && <p className="mt-3 opacity-90">Across {overall.n} completed modules, average scores rose from {overall.pre} to {overall.post} (+{overall.gain} points on a 100-point scale).</p>}
      </section>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          [students, "students reached"],
          [shown.length, "classes"],
          [Math.round(t.seconds / 3600), "hours of practice"],
          [t.hints, "AI hints given (never answers)"],
        ].map(([v, l]) => (
          <div key={String(l)} className="card p-4"><p className="text-2xl font-extrabold">{v}</p><p className="text-xs text-muted">{l}</p></div>
        ))}
      </section>

      <section className="card p-5"><GainChart title="Pre-test vs post-test by concept" data={byConcept} /></section>

      <section className="card overflow-hidden">
        <h2 className="border-b border-line p-4 font-bold">By class</h2>
        <table className="w-full text-sm">
          <thead className="bg-raised text-xs text-muted"><tr>{["Class", "School", "Students", "Completion", "Gain"].map((h) => <th key={h} scope="col" className="px-4 py-2 text-start">{h}</th>)}</tr></thead>
          <tbody>
            {shown.map((c) => (
              <tr key={c.id} className="border-t border-line">
                <th scope="row" className="px-4 py-2 text-start font-medium">{c.name}</th><td className="px-4 py-2">{c.school}</td><td className="px-4 py-2">{c.students}</td><td className="px-4 py-2">{c.completion_pct}%</td>
                <td className="px-4 py-2 font-mono">{c.learning_gain ? `+${c.learning_gain.gain}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="text-xs text-muted">
        <p><b>Method.</b> Each module begins with a pretest and ends with a posttest made of the same questions. Learning gain is the average of (posttest − pretest) for students who took both, on a 0–100 scale. Pretests count once and never reveal answers. No individual student data appears in this report.</p>
      </section>

      <ReportProof summary={summary} />
    </article>
  );
}
