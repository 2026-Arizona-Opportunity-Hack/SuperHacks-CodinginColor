import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, Clock, TrendingUp } from "lucide-react";
import { sha256, type Student } from "@/lib/auth";
import { one } from "@/lib/db";
import { journey, streakDays } from "@/lib/progress";
import { getT } from "@/i18n/server";

export const metadata: Metadata = { title: "Family view", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Read-only progress summary for a parent or guardian, in the language they pick. No login, no names of classmates. */
export default async function FamilyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{30,60}$/.test(token)) notFound();
  const s = await one<Student & { last_active: string | null; school: string; class_name: string }>(
    `SELECT s.id, s.class_id, s.display_name, s.resume_code, s.xp, s.last_active, c.school, c.name AS class_name
     FROM family_links f JOIN students s ON s.id = f.student_id JOIN classes c ON c.id = s.class_id
     WHERE f.token_hash = $1 AND f.revoked_at IS NULL`,
    [sha256(token)]
  );
  if (!s) notFound();
  const t = await getT();
  const [mods, streak] = await Promise.all([journey(s), streakDays(s.id)]);
  const assigned = mods.filter((m) => m.state !== "not_assigned");
  const done = assigned.filter((m) => m.state === "done" || m.state === "tested_out");
  const gains = done.map((m) => m.gain).filter((g): g is number => g != null);
  const avgGain = gains.length ? Math.round(gains.reduce((a, b) => a + b, 0) / gains.length) : null;
  const current = mods.find((m) => m.state === "current");
  const days = s.last_active ? Math.floor((Date.now() - new Date(s.last_active).getTime()) / 86400000) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <p className="text-sm font-semibold text-brand">{s.school} · {s.class_name}</p>
        <h1 className="h-display text-3xl">{t("family.title", { name: s.display_name })}</h1>
        <p className="text-muted">{t("family.subtitle")}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="card p-4"><p className="text-2xl font-extrabold">{done.length}/{assigned.length}</p><p className="text-xs text-muted">{t("family.modulesDone")}</p></div>
        <div className="card p-4"><p className="flex items-center gap-1 text-2xl font-extrabold text-good"><TrendingUp className="h-5 w-5" aria-hidden />{avgGain != null ? `+${avgGain}` : "—"}</p><p className="text-xs text-muted">{t("family.gain")}</p></div>
        <div className="card p-4"><p className="flex items-center gap-1 text-2xl font-extrabold"><Clock className="h-5 w-5 text-muted" aria-hidden />{days == null ? "—" : days === 0 ? t("family.today") : t("family.daysAgo", { n: days })}</p><p className="text-xs text-muted">{t("family.lastActive")} · 🔥 {streak}</p></div>
      </div>
      {current && <p className="card p-4 text-sm">{t("family.workingOn", { module: current.title })}</p>}
      <ul className="card divide-y divide-line">
        {assigned.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 p-4 text-sm">
            <span className="flex items-center gap-2">
              {m.state === "done" || m.state === "tested_out" ? <CheckCircle2 className="h-4 w-4 text-good" aria-hidden /> : <Circle className="h-4 w-4 text-muted" aria-hidden />}
              {m.position}. {m.title}
            </span>
            {m.gain != null && <span className="chip bg-good/15 text-good">+{m.gain}</span>}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">{t("family.privacy")}</p>
    </div>
  );
}
