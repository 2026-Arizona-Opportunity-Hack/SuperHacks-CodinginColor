import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { z } from "zod";
import { AlertTriangle, CheckCircle2, Clock, Download, Hand, Lightbulb, Printer, TrendingUp, UserX } from "lucide-react";
import { canManageClass, requireStaff } from "@/lib/auth";
import { one, q } from "@/lib/db";
import { classRoster, conceptHeat, gainRows, summarize } from "@/lib/stats";
import { LiveRefresh } from "./LiveRefresh";
import { Counter, GrowBar } from "@/components/motion/Effects";
import { ReteachCard } from "./ReteachCard";
import { RosterImport } from "./RosterImport";
import { JoinLock, ModuleToggle, StudentActions, ResolveHand } from "./ClassControls";

export const metadata: Metadata = { title: "Class dashboard" };

const STATUS = {
  stuck: { label: "Stuck", cls: "bg-bad/15 text-bad" },
  not_started: { label: "Not started", cls: "bg-raised text-muted" },
  on_track: { label: "On track", cls: "bg-brand/10 text-brand" },
  done: { label: "Done", cls: "bg-good/15 text-good" },
} as const;

const ago = (iso: string | null) => {
  if (!iso) return "never";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 1 ? "just now" : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};

export default async function ClassPage({ params, searchParams }: { params: Promise<{ classId: string }>; searchParams: Promise<{ created?: string }> }) {
  const user = await requireStaff(["admin", "instructor"]);
  const { classId } = await params;
  const { created } = await searchParams;
  if (!z.string().uuid().safeParse(classId).success || !(await canManageClass(user, classId))) notFound();

  const cls = await one("SELECT c.*, u.name AS instructor FROM classes c JOIN users u ON u.id = c.instructor_id WHERE c.id = $1", [classId]);
  if (!cls) notFound();
  const [roster, rows, modules, hints] = await Promise.all([
    classRoster(classId),
    gainRows({ classId }),
    q(
      `SELECT m.id, m.position, m.title, (cm.module_id IS NOT NULL) AS assigned FROM modules m
       LEFT JOIN class_modules cm ON cm.module_id = m.id AND cm.class_id = $1 WHERE m.course_id = $2 ORDER BY m.position`,
      [classId, cls.course_id]
    ),
    q(
      `SELECT e.id, s.display_name, e.concept, e.detail, e.created_at FROM struggle_events e JOIN students s ON s.id = e.student_id
       WHERE s.class_id = $1 AND e.kind = 'hint' ORDER BY e.created_at DESC LIMIT 8`,
      [classId]
    ),
  ]);
  const heat = conceptHeat(roster);
  const gain = summarize(rows, () => "c", () => "Class")[0];
  const perStudent = new Map(summarize(rows, (r) => r.student_id, (r) => r.display_name).map((g) => [g.key, g]));
  const stuck = roster.filter((s) => s.status === "stuck");
  const notStarted = roster.filter((s) => s.status === "not_started");
  const hands = roster.filter((s) => s.handRaised);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const joinUrl = `${origin}/join?code=${cls.join_code}`;
  const qr = await QRCode.toString(joinUrl, { type: "svg", margin: 1, color: { dark: "#18142b", light: "#ffffff" } });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/teach" className="text-sm text-muted hover:text-ink">← My classes</Link>
          <p className="mt-2 text-sm font-semibold text-brand">{cls.school}</p>
          <h1 className="h-display text-3xl">{cls.name}</h1>
          <p className="text-sm text-muted">{roster.length} students · {cls.instructor}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 no-print">
          <LiveRefresh />
          <JoinLock classId={classId} open={cls.join_open} />
          <a href={`/teach/${classId}/gradebook`} className="btn-ghost" download>
            <Download className="h-4 w-4" aria-hidden /> Gradebook CSV
          </a>
          <Link href={`/teach/${classId}/codes`} className="btn-ghost">
            <Printer className="h-4 w-4" aria-hidden /> Print resume codes
          </Link>
        </div>
      </div>

      {created && (
        <div role="status" className="card flex items-center gap-3 border-good/40 bg-good/5 p-4 text-sm">
          <CheckCircle2 className="h-5 w-5 text-good" aria-hidden /> Class created. Share the code below and students can start right away.
        </div>
      )}

      {/* Share card: what the teacher projects on day one */}
      <section className="card grid items-center gap-6 p-6 sm:grid-cols-[1fr_auto]" aria-labelledby="share">
        <div>
          <h2 id="share" className="text-sm font-semibold text-muted">Students go to <span className="font-mono text-ink">{origin.replace(/^https?:\/\//, "")}/join</span> and type</h2>
          <p className="mt-1 font-mono text-5xl font-extrabold tracking-[0.25em] text-brand">{cls.join_code}</p>
          <p className="mt-2 break-all text-xs text-muted">{joinUrl}</p>
        </div>
        <div className="h-32 w-32 rounded-xl bg-white p-1" role="img" aria-label={`QR code for ${joinUrl}`} dangerouslySetInnerHTML={{ __html: qr }} />
      </section>

      {/* Headline numbers */}
      <section className="cascade grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Class summary">
        <Stat icon={<AlertTriangle className="h-5 w-5 text-bad" />} value={<Counter value={stuck.length} />} label="stuck right now" />
        <Stat icon={<UserX className="h-5 w-5 text-muted" />} value={<Counter value={notStarted.length} />} label="haven't started" />
        <Stat icon={<Hand className="h-5 w-5 text-warn" />} value={<Counter value={hands.length} />} label="hands raised" />
        <Stat icon={<TrendingUp className="h-5 w-5 text-good" />} value={gain ? <Counter value={gain.gain} decimals={1} prefix={gain.gain >= 0 ? "+" : ""} /> : "—"} label={gain ? `learning gain (pts, n=${gain.n})` : "learning gain (no post-tests yet)"} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          {hands.length > 0 && (
            <section className="card border-warn/40 p-5" aria-labelledby="hands">
              <h2 id="hands" className="flex items-center gap-2 font-bold"><Hand className="h-4 w-4 text-warn" aria-hidden /> Hands raised</h2>
              <ul className="mt-3 space-y-2">
                {hands.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl bg-warn/10 px-3 py-2 text-sm">
                    <span><b>{s.display_name}</b>{s.current && <span className="text-muted"> · {s.current.module} → {s.current.activity}</span>}</span>
                    <ResolveHand classId={classId} studentId={s.id} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card overflow-hidden" aria-labelledby="roster">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-5">
              <h2 id="roster" className="font-bold">Students</h2>
              <RosterImport classId={classId} />
            </div>
            {roster.length === 0 ? (
              <p className="p-8 text-center text-muted">No students yet. Import a roster above, or share the join code: students can add themselves.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-raised text-start text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-start">Student</th>
                      <th scope="col" className="px-4 py-2 text-start">Status</th>
                      <th scope="col" className="px-4 py-2 text-start">Progress</th>
                      <th scope="col" className="px-4 py-2 text-start">Working on</th>
                      <th scope="col" className="px-4 py-2 text-start">Gain</th>
                      <th scope="col" className="px-4 py-2 text-start">Active</th>
                      <th scope="col" className="px-4 py-2"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="cascade">
                    {[...roster].sort((a, b) => order(a.status) - order(b.status)).map((s) => {
                      const pct = s.total ? Math.round((100 * Math.min(s.completed, s.total)) / s.total) : 0;
                      const g = perStudent.get(s.id);
                      const topStruggle = Object.entries(s.struggles).sort((a, b) => b[1] - a[1])[0];
                      return (
                        <tr key={s.id} className="border-t border-line">
                          <th scope="row" className="px-4 py-3 text-start font-semibold">
                            {s.display_name}
                            {!s.claimed && <span className="ms-2 chip bg-raised text-muted">not joined</span>}
                          </th>
                          <td className="px-4 py-3"><span className={`chip ${STATUS[s.status].cls} ${s.status === "stuck" ? "pulse-soft" : ""}`}>{STATUS[s.status].label}</span></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-20 overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${s.display_name} progress`}>
                                <GrowBar pct={pct} className="bg-brand" />
                              </div>
                              <span className="text-xs text-muted">{pct}%</span>
                            </div>
                          </td>
                          <td className="min-w-[220px] px-4 py-3 text-xs">
                            {s.current ? (
                              <span>
                                {s.current.module} → {s.current.activity}
                                <span className="block text-muted"><Clock className="inline h-3 w-3" aria-hidden /> {s.current.minutes} min · {s.current.attempts} tries</span>
                              </span>
                            ) : <span className="text-muted">—</span>}
                            {topStruggle && topStruggle[1] >= 2 && <span className="mt-1 block text-bad">struggling: {topStruggle[0]}</span>}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{g ? `${g.pre}→${g.post} (${g.gain >= 0 ? "+" : ""}${g.gain})` : "—"}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{ago(s.last_active)}</td>
                          <td className="px-4 py-3"><StudentActions classId={classId} studentId={s.id} name={s.display_name} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-5" aria-labelledby="heat">
            <h2 id="heat" className="font-bold">Where the class is stuck</h2>
            <p className="text-xs text-muted">Share of students with 2+ failed runs or hints on a concept (last 14 days)</p>
            {heat.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No struggle signals yet. They appear as students run code and ask for hints.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {heat.map((c) => (
                  <li key={c.concept}>
                    <div className="flex justify-between text-sm"><span className="font-semibold capitalize">{c.concept}</span><span>{c.count}/{roster.length} · {c.pct}%</span></div>
                    <div className="mt-1 h-3 overflow-hidden rounded-full bg-raised">
                      <GrowBar pct={c.pct} className={`rounded-full ${c.pct >= 50 ? "bg-bad" : c.pct >= 25 ? "bg-warn" : "bg-good"}`} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {heat[0] && <ReteachCard classId={classId} concept={heat[0].concept} pct={heat[0].pct} />}
          </section>

          <section className="card p-5" aria-labelledby="mods">
            <h2 id="mods" className="font-bold">Assigned modules</h2>
            <p className="text-xs text-muted">Students only see assigned modules, in order.</p>
            <ul className="mt-3 space-y-2">
              {modules.map((m) => (
                <li key={m.id}><ModuleToggle classId={classId} moduleId={m.id} label={`${m.position}. ${m.title}`} assigned={m.assigned} /></li>
              ))}
            </ul>
          </section>

          <section className="card p-5" aria-labelledby="hints">
            <h2 id="hints" className="flex items-center gap-2 font-bold"><Lightbulb className="h-4 w-4 text-accent" aria-hidden /> Recent AI hints</h2>
            <p className="text-xs text-muted">Every hint the tutor gave, so you can check its quality.</p>
            {hints.length === 0 ? <p className="mt-3 text-sm text-muted">No hints yet.</p> : (
              <ul className="mt-3 space-y-3">
                {hints.map((x) => (
                  <li key={x.id} className="rounded-xl bg-raised p-3 text-xs">
                    <p className="font-semibold">{x.display_name} · <span className="capitalize">{x.concept}</span> · {ago(new Date(x.created_at).toISOString())}</p>
                    {x.detail?.question && <p className="mt-1 text-muted">Asked: “{x.detail.question}”</p>}
                    <p className="mt-1">💡 {x.detail?.hint}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

const order = (s: string) => ({ stuck: 0, not_started: 1, on_track: 2, done: 3 })[s] ?? 4;

function Stat({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className="card card-hover flex items-center gap-4 p-5">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-raised" aria-hidden>{icon}</span>
      <div>
        <p className="text-2xl font-extrabold">{value}</p>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}
