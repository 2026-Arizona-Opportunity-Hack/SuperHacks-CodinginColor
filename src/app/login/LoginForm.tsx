"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { useT } from "@/i18n/client";
import { login, type FormState } from "@/app/actions/staff";

export function LoginForm({ showDemo }: { showDemo: boolean }) {
  const t = useT();
  const [state, action, pending] = useActionState<FormState, FormData>(login, undefined);
  const err = state?.error === "rate" ? t("login.tooMany") : state?.error ? t("login.failed") : "";
  return (
    <div className="mx-auto max-w-md pt-6">
      <form action={action} className="card space-y-4 p-6 sm:p-8">
        <div>
          <h1 className="h-display text-3xl">{t("login.title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("login.subtitle")}</p>
        </div>
        <div>
          <label className="label" htmlFor="email">
            {t("login.email")}
          </label>
          <input id="email" name="email" type="email" autoComplete="username" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">
            {t("login.password")}
          </label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
        </div>
        {err && (
          <p role="alert" className="text-sm font-medium text-bad">
            {err}
          </p>
        )}
        <button className="btn-primary w-full" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} {t("login.submit")}
        </button>
        <Link href="/signup" className="block text-center text-sm font-medium text-brand underline-offset-2 hover:underline">
          {t("login.signupLink")}
        </Link>
      </form>
      {showDemo && (
        <div className="card mt-4 p-4 text-xs text-muted">
          <p className="font-semibold text-ink">Demo accounts (password: cic-demo-2026)</p>
          <ul className="mt-1 space-y-0.5 font-mono">
            <li>admin@codingincolor.org: CIC admin</li>
            <li>instructor@codingincolor.org: CIC instructor</li>
            <li>teacher@phxunion.org: partner-school teacher</li>
            <li>reviewer@district.org: district reviewer (read-only)</li>
          </ul>
        </div>
      )}
    </div>
  );
}
