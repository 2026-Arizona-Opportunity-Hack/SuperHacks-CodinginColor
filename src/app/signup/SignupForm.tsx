"use client";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { useT } from "@/i18n/client";
import { signup, type FormState } from "@/app/actions/staff";

export function SignupForm() {
  const t = useT();
  const [state, action, pending] = useActionState<FormState, FormData>(signup, undefined);
  const err = !state?.error ? "" : state.error === "exists" ? t("signup.exists") : state.error === "rate" ? t("login.tooMany") : state.error === "invalid" ? t("common.error") : state.error;
  return (
    <form action={action} className="card mx-auto max-w-md space-y-4 p-6 sm:p-8">
      <div>
        <h1 className="h-display text-3xl">{t("signup.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("signup.subtitle")}</p>
      </div>
      <div>
        <label className="label" htmlFor="name">{t("signup.name")}</label>
        <input id="name" name="name" required maxLength={80} autoComplete="name" className="input" defaultValue={state?.values?.name ?? ""} key={"name-" + (state?.values?.name ?? "")} />
      </div>
      <div>
        <label className="label" htmlFor="organization">{t("signup.org")}</label>
        <input id="organization" name="organization" required maxLength={120} autoComplete="organization" className="input" defaultValue={state?.values?.organization ?? ""} key={"organization-" + (state?.values?.organization ?? "")} />
      </div>
      <div>
        <label className="label" htmlFor="email">{t("login.email")}</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" defaultValue={state?.values?.email ?? ""} key={"email-" + (state?.values?.email ?? "")} />
      </div>
      <div>
        <label className="label" htmlFor="password">{t("login.password")}</label>
        <input id="password" name="password" type="password" required minLength={12} autoComplete="new-password" className="input" aria-describedby="pw-help" />
        <p id="pw-help" className="mt-1 text-xs text-muted">12+ characters. A short sentence you'll remember works well. Common passwords are refused.</p>
      </div>
      <fieldset>
        <legend className="label">{t("signup.role")}</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-line p-3 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/10">
            <input type="radio" name="role" value="instructor" defaultChecked={state?.values?.role !== "reviewer"} /> {t("signup.roleInstructor")}
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-line p-3 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/10">
            <input type="radio" name="role" value="reviewer" defaultChecked={state?.values?.role === "reviewer"} /> {t("signup.roleReviewer")}
          </label>
        </div>
      </fieldset>
      {err && <p role="alert" className="text-sm font-medium text-bad">{err}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} {t("signup.submit")}
      </button>
    </form>
  );
}
