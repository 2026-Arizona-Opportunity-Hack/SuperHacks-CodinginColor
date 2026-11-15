import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Flame, Sparkles, Trophy, Zap } from "lucide-react";
import { Counter } from "@/components/motion/Effects";
import { currentStudent } from "@/lib/auth";
import { one, q } from "@/lib/db";
import { BADGES, journey, streakDays } from "@/lib/progress";
import { getT } from "@/i18n/server";
import { SwitchStudent } from "./SwitchStudent";
import { JourneyPath } from "./JourneyPath";
import { LeaderboardToggle } from "./LeaderboardToggle";
import { CertificateCard } from "./CertificateCard";
import { FamilyCard } from "./FamilyCard";
import { OfflineToggle } from "@/components/OfflineToggle";
import { myCertificate } from "@/app/actions/proofs";

export const metadata: Metadata = { title: "My journey" };

export default async function LearnPage() {
  const student = await currentStudent();
  if (!student) redirect("/join");
  const t = await getT();
  const [modules, streak, cls, stats, board] = await Promise.all([
    journey(student),
    streakDays(student.id),
    one("SELECT name, school FROM classes WHERE id = $1", [student.class_id]),
    one(
      `SELECT count(*) FILTER (WHERE p.status = 'completed')::int AS completed,
              count(*) FILTER (WHERE p.status = 'completed' AND a.kind = 'code')::int AS code_passed,
              bool_or(a.kind = 'code' AND p.status = 'completed' AND p.attempts > 1) AS retried
       FROM progress p JOIN activities a ON a.id = p.activity_id WHERE p.student_id = $1`,
      [student.id]
    ),
    q(
      `SELECT id, display_name, xp FROM students WHERE class_id = $1 AND NOT hide_from_leaderboard AND xp > 0 ORDER BY xp DESC LIMIT 5`,
      [student.class_id]
    ),
  ]);
  await q("UPDATE students SET last_active = now() WHERE id = $1", [student.id]);
  const certId = await myCertificate();
  const familyOn = !!(await one("SELECT 1 FROM family_links WHERE student_id = $1 AND revoked_at IS NULL", [student.id]));
  const hidden = (await one("SELECT hide_from_leaderboard AS h FROM students WHERE id = $1", [student.id]))?.h ?? false;

  const modulesDone = modules.filter((m) => m.state === "done").length;
  const bestGain = Math.max(0, ...modules.map((m) => m.gain ?? 0));
  const earned = BADGES.filter((b) =>
    b.test({ completed: stats?.completed ?? 0, modulesDone, codePassed: stats?.code_passed ?? 0, retriedThenPassed: !!stats?.retried, streak, bestGain } as any)
  );
  const current = modules.find((m) => m.state === "current");
  const hasStarted = modules.some((m) => m.completed > 0 || m.state === "tested_out");
  const assignedAhead = modules.filter((m) => m.state !== "not_assigned").length;
  const showCatchUp = !hasStarted && assignedAhead >= 2;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section aria-labelledby="journey">
        <p className="text-sm font-semibold text-brand">
          {cls?.school} · {cls?.name}
        </p>
        <h1 className="h-display mt-1 text-3xl sm:text-4xl">{t("learn.hello", { name: student.display_name })}</h1>

        {showCatchUp && (
          <div className="card mt-6 flex flex-col gap-4 border-accent/40 bg-accent/5 p-5 sm:flex-row sm:items-center">
            <Sparkles className="h-8 w-8 shrink-0 text-accent" aria-hidden />
            <div className="flex-1">
              <h2 className="font-bold">{t("learn.catchUpTitle")}</h2>
              <p className="text-sm text-muted">{t("learn.catchUpBody", { n: assignedAhead })}</p>
            </div>
            <Link href="/learn/catch-up" className="btn-accent shrink-0">
              {t("learn.catchUpCta")}
            </Link>
          </div>
        )}

        <h2 id="journey" className="mt-8 font-display text-xl font-bold">
          {t("learn.journey")}
        </h2>
        <JourneyPath
          modules={modules}
          labels={{
            startHere: t("learn.startHere"),
            continue: t("learn.continue"),
            review: t("learn.review"),
            locked: t("learn.locked"),
            lockedHelp: t("learn.lockedHelp"),
            notAssigned: t("learn.notAssigned"),
            notAssignedHelp: t("learn.notAssignedHelp"),
            completed: t("learn.completed"),
            testedOut: t("learn.testedOut"),
            module: t("common.module"),
          }}
          currentId={current?.id}
        />
      </section>

      <aside className="cascade space-y-4">
        <CertificateCard existingId={certId} eligible={assignedAhead > 0 && modules.filter((m) => m.state !== "not_assigned").every((m) => m.state === "done" || m.state === "tested_out")} />
        <div className="card grid grid-cols-2 gap-3 p-5">
          <div>
            <p className="flex items-center gap-1 text-2xl font-extrabold">
              <Zap className="h-5 w-5 text-brand" aria-hidden /> <Counter value={student.xp} />
            </p>
            <p className="text-xs text-muted">{t("learn.xp")}</p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-2xl font-extrabold">
              <Flame className="h-5 w-5 text-accent" aria-hidden /> {streak}
            </p>
            <p className="text-xs text-muted">{t("learn.streak")}</p>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-bold">{t("learn.badges")}</h2>
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {BADGES.map((b) => {
              const has = earned.some((e) => e.id === b.id);
              return (
                <li key={b.id} className={`rounded-xl p-2 text-center ${has ? "bg-brand/10" : "opacity-40 grayscale"}`} title={b.label}>
                  <span className="text-2xl" aria-hidden>
                    {b.emoji}
                  </span>
                  <p className="text-[11px] font-medium leading-tight">
                    {b.label}
                    <span className="sr-only">{has ? " (earned)" : " (not yet)"}</span>
                  </p>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <Trophy className="h-4 w-4 text-warn" aria-hidden /> {t("learn.leaderboard")}
          </h2>
          <ol className="mt-3 space-y-1.5">
            {board.map((b, i) => (
              <li key={b.id} className={`flex items-center justify-between rounded-lg px-2 py-1 text-sm ${b.id === student.id ? "bg-brand/10 font-bold" : ""}`}>
                <span>
                  {i + 1}. {b.display_name}
                </span>
                <span className="font-mono">{b.xp}</span>
              </li>
            ))}
          </ol>
          <LeaderboardToggle hidden={hidden} label={t("learn.leaderboardOptOut")} />
        </div>

        <div className="card p-5">
          <h2 className="font-bold">{t("learn.resumeCode")}</h2>
          <p className="mt-2 font-mono text-2xl tracking-[0.3em]">{student.resume_code}</p>
          <p className="mt-1 text-xs text-muted">{t("learn.resumeCodeHelp")}</p>
        </div>

        <OfflineToggle variant="card" urls={["/", "/join", "/play", "/offline", "/learn", ...modules.filter((m) => m.state !== "locked" && m.state !== "not_assigned").map((m) => `/learn/m/${m.id}`)]} />

        <FamilyCard active={familyOn} />

        <SwitchStudent label={t("learn.leave")} />
      </aside>
    </div>
  );
}

