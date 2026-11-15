import Link from "next/link";
import { ArrowRight, BarChart3, Lightbulb, Link2, ShieldCheck, Sparkles } from "lucide-react";
import { getT } from "@/i18n/server";
import { Reveal, HeroCode, CountUp } from "@/components/landing/Motion";
import { q } from "@/lib/db";
import { learningGain } from "@/lib/stats";
import { ImpactGlobe } from "@/components/landing/ImpactGlobe";
import { CrowdCanvas } from "@/components/landing/CrowdCanvas";
import { TeamSection } from "@/components/landing/TeamSection";
import { LOCALES } from "@/i18n/config";
import { FloatingCode, Magnetic, ScrollLine, Spotlight, SplitWords, TiltCard } from "@/components/motion/Effects";

export default async function Home() {
  const t = await getT();
  // Live numbers from the database, not hard-coded marketing copy.
  const [gain] = await learningGain({ concept: "loops", cohort: "Maryvale Fall 2026" });
  const [{ n: students }] = await q<{ n: number }>("SELECT count(*)::int AS n FROM students");
  const [reach] = await q<{ classes: number; schools: number; orgs: number; activities: number }>(
    `SELECT (SELECT count(*)::int FROM classes) AS classes, (SELECT count(DISTINCT school)::int FROM classes WHERE school <> '') AS schools,
            (SELECT count(DISTINCT organization)::int FROM users) AS orgs, (SELECT count(*)::int FROM progress WHERE status = 'completed') AS activities`
  );
  const schoolNames = (await q<{ school: string }>("SELECT DISTINCT school FROM classes WHERE school <> '' ORDER BY school LIMIT 6")).map((r) => r.school);

  const steps = [
    { icon: Link2, title: t("landing.step1t"), body: t("landing.step1d") },
    { icon: Sparkles, title: t("landing.step2t"), body: t("landing.step2d") },
    { icon: Lightbulb, title: t("landing.step3t"), body: t("landing.step3d") },
    { icon: BarChart3, title: t("landing.step4t"), body: t("landing.step4d") },
  ];

  return (
    <div className="relative">
      <div className="mesh lite-hide pointer-events-none absolute inset-x-[-20%] top-[-120px] -z-10 h-[620px]" aria-hidden />

      <section className="relative grid items-center gap-10 pb-10 pt-6 lg:grid-cols-[1.1fr_1fr] lg:pt-14">
        <Spotlight />
        <FloatingCode />
        <div>
          <Reveal>
            <span className="chip bg-brand/10 text-brand">{t("landing.badge")}</span>
          </Reveal>
          <h1 className="h-display mt-4 text-4xl leading-[1.05] sm:text-6xl">
            <SplitWords text={t("landing.title1")} delay={0.05} />
            <br />
            <SplitWords text={t("landing.title2")} delay={0.3} className="text-shimmer bg-gradient-to-r from-brand via-accent to-brand bg-clip-text text-transparent" />
          </h1>
          <Reveal delay={0.1}>
            <p className="mt-5 max-w-xl text-lg text-muted">{t("landing.subtitle")}</p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-7 flex flex-wrap gap-3">
              <Magnetic>
                <Link href="/join" className="btn-primary !min-h-[52px] !px-6 text-base shadow-[0_10px_30px_-10px_rgb(var(--brand)/.7)]">
                  {t("landing.ctaStudent")} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
                </Link>
              </Magnetic>
              <Magnetic>
                <Link href="/login" className="btn-ghost !min-h-[52px] !px-6 text-base">
                  {t("landing.ctaTeacher")}
                </Link>
              </Magnetic>
            </div>
          </Reveal>
          <Reveal delay={0.2}>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4">
              <div>
                <dt className="sr-only">{t("landing.stat1")}</dt>
                <dd className="h-display text-3xl text-good" dir="ltr">
                  +<CountUp to={Math.round(gain?.gain ?? 0)} />
                </dd>
                <p className="text-xs text-muted">{t("landing.stat1")}</p>
              </div>
              <div>
                <dt className="sr-only">{t("landing.stat2")}</dt>
                <dd className="h-display text-3xl" dir="ltr">
                  &lt;<CountUp to={10} />
                </dd>
                <p className="text-xs text-muted">{t("landing.stat2")}</p>
              </div>
              <div>
                <dt className="sr-only">{t("landing.stat3")}</dt>
                <dd className="h-display text-3xl">0</dd>
                <p className="text-xs text-muted">{t("landing.stat3")}</p>
              </div>
            </dl>
          </Reveal>
        </div>
        <HeroCode students={students} />
      </section>

      <section className="mt-24" aria-labelledby="how">
        <Reveal>
          <h2 id="how" className="h-display text-3xl">
            {t("landing.how")}
          </h2>
        </Reveal>
        <ScrollLine className="mt-6 hidden lg:block" />
        <ol className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.08}>
              <TiltCard className="h-full">
              <li className="card card-hover h-full list-none p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand">
                    <s.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="font-mono text-sm text-muted">0{i + 1}</span>
                </div>
                <h3 className="mt-4 font-display text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted">{s.body}</p>
              </li>
              </TiltCard>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="mt-24" aria-label="Reach">
        <Reveal>
          <ImpactGlobe
            languages={LOCALES.map((l) => ({ code: l.code, label: l.label }))}
            schools={schoolNames}
            stats={[
              { label: "students", value: students },
              { label: "classes", value: reach.classes },
              { label: "schools", value: reach.schools },
              { label: "activities completed", value: reach.activities },
            ]}
          />
        </Reveal>
      </section>

      {/* Walking crowd: every student, any background. Full-bleed band; decorative only. */}
      <section aria-labelledby="crowd" className="relative left-1/2 mt-20 h-[360px] w-screen -translate-x-1/2 overflow-hidden sm:h-[400px]">
        <div className="relative z-10 mx-auto max-w-2xl px-4 text-center">
          <h2 id="crowd" className="h-display text-3xl sm:text-4xl">{t("landing.crowdTitle")}</h2>
          <p className="mt-2 text-muted">{t("landing.crowdBody")}</p>
        </div>
        <CrowdCanvas exclude={[17, 72, 92, 100]} scale={0.55} className="absolute inset-x-0 bottom-0 h-[260px] w-full sm:h-[300px]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-bg to-transparent" aria-hidden />
      </section>

      <Reveal>
        <section className="card mt-16 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
          <ShieldCheck className="h-8 w-8 shrink-0 text-good" aria-hidden />
          <p className="font-medium">{t("landing.privacy")}</p>
        </section>
      </Reveal>

      <div className="relative left-1/2 mt-20 w-screen -translate-x-1/2">
        <TeamSection />
      </div>

      {process.env.SHOW_DEMO_ACCOUNTS !== "false" && (
      <section className="mt-10 text-sm text-muted" aria-labelledby="demo">
        <h2 id="demo" className="font-semibold text-ink">
          {t("landing.demoAccounts")}
        </h2>
        <p className="mt-1">
          Class codes <code className="font-mono">MARY26</code>, <code className="font-mono">EDGE26</code>, <code className="font-mono">SALT26</code> ·
          Staff: <code className="font-mono">admin@codingincolor.org</code>, <code className="font-mono">instructor@codingincolor.org</code>,{" "}
          <code className="font-mono">reviewer@district.org</code> (password in the README)
        </p>
      </section>
      )}
      <p className="mt-10 text-xs text-muted">
        Crowd animation adapted from <a className="underline" href="https://skiper-ui.com" rel="noreferrer">Skiper UI</a> · Open Peeps illustrations by{" "}
        <a className="underline" href="https://www.openpeeps.com" rel="noreferrer">Pablo Stanley</a> · Team badges by{" "}
        <a className="underline" href="https://21st.dev/@dhxwhy" rel="noreferrer">@dhxwhy</a> · World map: Natural Earth
      </p>
    </div>
  );
}
