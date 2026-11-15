import type { Metadata } from "next";
import Link from "next/link";
import { FileText, KeyRound, ScrollText, Users } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { q } from "@/lib/db";
import { cohortStats, gainRows, summarize } from "@/lib/stats";
import { GainChart } from "@/components/GainChart";
import { ApiKeys, RoleSelect } from "./AdminControls";
import { Counter } from "@/components/motion/Effects";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const me = await requireStaff(["admin"]);
  const [classes, rows, keys, users, log, totals] = await Promise.all([
    cohortStats(),
    gainRows(),
    q("SELECT id, name, prefix, created_at, last_used_at, revoked_at FROM api_keys ORDER BY created_at DESC"),
    q("SELECT id, name, email, role, organization FROM users ORDER BY role, name"),
    q("SELECT actor, action, target, created_at FROM audit_log ORDER BY id DESC LIMIT 15"),
    q(`SELECT (SELECT count(*)::int FROM students) AS students,
              (SELECT count(*)::int FROM students WHERE last_active > now() - interval '7 days') AS active,
              (SELECT count(*)::int FROM classes) AS classes,
              (SELECT count(DISTINCT organization)::int FROM users) AS orgs`),
  ]);
  const overall = summarize(rows, () => "all", () => "All")[0];
  const byConcept = summarize(rows, (r) => r.concept, (r) => r.concept);
  const byCohort = summarize(rows, (r) => r.cohort, (r) => r.cohort);
  const t = totals[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand">Coding in Color</p>
          <h1 className="h-display text-3xl">Program health</h1>
        </div>
        <Link href="/admin/report" className="btn-primary"><FileText className="h-4 w-4" aria-hidden /> Funder report</Link>
      </div>

      <section className="cascade grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Totals">
        <Tile value={overall ? <Counter value={overall.gain} decimals={1} prefix={overall.gain >= 0 ? "+" : ""} /> : "—"} label={`avg learning gain (pts), ${overall?.n ?? 0} student-modules`} accent />
        <Tile value={<Counter value={t.students} />} label={`students · ${t.active} active this week`} />
        <Tile value={<Counter value={t.classes} />} label="classes" />
        <Tile value={<Counter value={t.orgs} />} label="partner organizations" />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5"><GainChart title="Learning gain by concept" data={byConcept} /></section>
        <section className="card p-5"><GainChart title="Learning gain by cohort" data={byCohort} /></section>
      </div>

      <section className="card overflow-hidden" aria-labelledby="cohorts">
        <h2 id="cohorts" className="border-b border-line p-5 font-bold">Every class</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-raised text-xs uppercase tracking-wide text-muted">
              <tr>
                {["Class", "Cohort", "Instructor", "Students", "Active 7d", "Completion", "Learning gain"].map((h) => <th key={h} scope="col" className="px-4 py-2 text-start">{h}</th>)}
              </tr>
            </thead>
            <tbody className="cascade">
              {classes.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <th scope="row" className="px-4 py-3 text-start"><Link href={`/teach/${c.id}`} className="font-semibold text-brand hover:underline">{c.name}</Link><span className="block text-xs font-normal text-muted">{c.school}</span></th>
                  <td className="px-4 py-3">{c.cohort}</td>
                  <td className="px-4 py-3">{c.instructor}<span className="block text-xs text-muted">{c.organization}</span></td>
                  <td className="px-4 py-3">{c.students}</td>
                  <td className="px-4 py-3">{c.active_7d}</td>
                  <td className="px-4 py-3">{c.completion_pct}%</td>
                  <td className="px-4 py-3 font-mono">{c.learning_gain ? `${c.learning_gain.pre}→${c.learning_gain.post} (${c.learning_gain.gain >= 0 ? "+" : ""}${c.learning_gain.gain})` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="keys">
          <h2 id="keys" className="flex items-center gap-2 font-bold"><KeyRound className="h-4 w-4 text-brand" aria-hidden /> Read API keys</h2>
          <p className="mt-1 text-xs text-muted">For CIC&apos;s org dashboard. Keys return aggregated numbers only, never student names. See <code className="font-mono">docs/api.md</code>.</p>
          <ApiKeys keys={keys.map((k) => ({ ...k, created_at: String(k.created_at), last_used_at: k.last_used_at ? String(k.last_used_at) : null, revoked_at: k.revoked_at ? String(k.revoked_at) : null })) as any} />
        </section>

        <section className="card p-5" aria-labelledby="people">
          <h2 id="people" className="flex items-center gap-2 font-bold"><Users className="h-4 w-4 text-brand" aria-hidden /> Staff &amp; roles</h2>
          <ul className="mt-3 divide-y divide-line">
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0"><b className="block truncate">{u.name}</b><span className="block truncate text-xs text-muted">{u.email} · {u.organization}</span></span>
                <RoleSelect userId={u.id} role={u.role} disabled={u.id === me.id} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card p-5" aria-labelledby="audit">
        <h2 id="audit" className="flex items-center gap-2 font-bold"><ScrollText className="h-4 w-4 text-brand" aria-hidden /> Audit log</h2>
        <ul className="mt-3 space-y-1 font-mono text-xs">
          {log.map((l, i) => <li key={i}><span className="text-muted">{new Date(l.created_at).toISOString().slice(0, 16).replace("T", " ")}</span> {l.actor} · {l.action} {l.target && <span className="text-muted">({l.target})</span>}</li>)}
        </ul>
      </section>
    </div>
  );
}

function Tile({ value, label, accent }: { value: React.ReactNode; label: string; accent?: boolean }) {
  return (
    <div className="card card-hover p-5">
      <p className={`text-3xl font-extrabold ${accent ? "text-good" : ""}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}
