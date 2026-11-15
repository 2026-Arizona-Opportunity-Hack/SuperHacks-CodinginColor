"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, KeyRound, Loader2, UserPlus } from "lucide-react";
import { useT } from "@/i18n/client";
import { claimSeat, joinAsNew, lookupClass, resume, type JoinLookup, type JoinResult } from "@/app/actions/join";

export function JoinFlow({ initialCode }: { initialCode: string }) {
  const t = useT();
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [cls, setCls] = useState<Extract<JoinLookup, { ok: true }> | null>(null);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [resumeCode, setResumeCode] = useState("");
  const [pending, start] = useTransition();

  const errorText = (e: string) =>
    e === "claimed" ? t("join.claimed") : e === "not_found" ? t("join.notFound") : e === "rate_limited" ? t("login.tooMany") : t("common.error");

  const find = (c = code) =>
    start(async () => {
      setError("");
      const r = await lookupClass(c);
      if (r.ok) setCls(r);
      else setError(errorText(r.error));
    });

  // A share link like /join?code=MARY26 skips straight to the roster.
  useEffect(() => {
    if (initialCode) find(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = (p: Promise<JoinResult>) =>
    start(async () => {
      setError("");
      const r = await p;
      if (r.ok) router.push("/learn");
      else setError(errorText(r.error));
    });

  return (
    <div className="mx-auto max-w-lg pt-6">
      <AnimatePresence mode="wait">
        {!cls ? (
          <motion.form
            key="code"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="card p-6 sm:p-8"
            onSubmit={(e) => {
              e.preventDefault();
              find();
            }}
          >
            <h1 className="h-display text-3xl">{t("join.title")}</h1>
            <p className="mt-2 text-muted">{t("join.subtitle")}</p>
            <label className="label mt-6" htmlFor="code">
              {t("join.code")}
            </label>
            <input
              id="code"
              className="input text-center font-mono text-2xl uppercase tracking-[0.3em]"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="MARY26"
              required
              aria-describedby={error ? "join-error" : undefined}
            />
            <button className="btn-primary mt-4 w-full !min-h-[52px] text-base" disabled={pending || code.length < 4}>
              {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <ArrowRight className="h-5 w-5 rtl:rotate-180" aria-hidden />}
              {t("join.continue")}
            </button>
            {error && (
              <p id="join-error" role="alert" className="mt-3 text-sm font-medium text-bad">
                {error}
              </p>
            )}
          </motion.form>
        ) : (
          <motion.div key="roster" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="card p-6 sm:p-8">
              <p className="text-sm font-semibold text-brand">{cls.school}</p>
              <h1 className="h-display mt-1 text-2xl">{cls.className}</h1>
              <h2 className="mt-5 font-semibold">{t("join.pickName")}</h2>
              <p className="text-sm text-muted">{t("join.pickNameHelp")}</p>
              <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {cls.roster.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => finish(claimSeat(code, s.id))}
                      className="btn-ghost w-full justify-between !px-3"
                      aria-describedby={s.claimed ? `claimed-${s.id}` : undefined}
                    >
                      <span className="truncate">{s.name}</span>
                      {s.claimed && (
                        <span id={`claimed-${s.id}`} className="chip bg-raised text-muted">
                          {t("join.claimedShort")}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              <form
                className="mt-6 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  finish(joinAsNew(code, newName));
                }}
              >
                <label className="sr-only" htmlFor="newname">
                  {t("join.newName")}
                </label>
                <input id="newname" className="input" maxLength={40} placeholder={t("join.newName")} value={newName} onChange={(e) => setNewName(e.target.value)} />
                <button className="btn-primary shrink-0" disabled={pending || !newName.trim()}>
                  <UserPlus className="h-4 w-4" aria-hidden /> {t("join.add")}
                </button>
              </form>
            </div>
            <form
              className="card p-6"
              onSubmit={(e) => {
                e.preventDefault();
                finish(resume(code, resumeCode));
              }}
            >
              <h2 className="flex items-center gap-2 font-semibold">
                <KeyRound className="h-4 w-4 text-brand" aria-hidden /> {t("join.resumeTitle")}
              </h2>
              <p className="text-sm text-muted">{t("join.resumeHelp")}</p>
              <div className="mt-3 flex gap-2">
                <label className="sr-only" htmlFor="resume">
                  {t("learn.resumeCode")}
                </label>
                <input
                  id="resume"
                  className="input font-mono uppercase tracking-widest"
                  maxLength={6}
                  value={resumeCode}
                  onChange={(e) => setResumeCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                />
                <button className="btn-ghost shrink-0" disabled={pending || resumeCode.length !== 6}>
                  {t("join.resume")}
                </button>
              </div>
            </form>
            {error && (
              <p role="alert" className="text-center text-sm font-medium text-bad">
                {error}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
