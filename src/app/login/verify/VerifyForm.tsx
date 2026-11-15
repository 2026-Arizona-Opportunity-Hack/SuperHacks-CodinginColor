"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { verifyMfa, type FormState } from "@/app/actions/staff";

export function VerifyForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(verifyMfa, undefined);
  const err =
    state?.error === "expired" ? "This sign-in expired. Please sign in again." : state?.error === "rate" ? "Too many attempts. Wait a minute." : state?.error ? "That code didn't work. Try the newest code from your app." : "";
  return (
    <form action={action} className="card mx-auto max-w-md space-y-4 p-6 sm:p-8">
      <ShieldCheck className="h-10 w-10 text-good" aria-hidden />
      <div>
        <h1 className="h-display text-3xl">Two-step verification</h1>
        <p className="mt-1 text-sm text-muted">Enter the 6-digit code from your authenticator app, or one of your backup codes.</p>
      </div>
      <div>
        <label className="label" htmlFor="code">Code</label>
        <input id="code" name="code" required autoFocus autoComplete="one-time-code" inputMode="text" maxLength={12} className="input text-center font-mono text-2xl tracking-[0.3em]" />
      </div>
      {err && <p role="alert" className="text-sm font-medium text-bad">{err}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Verify
      </button>
      {state?.error === "expired" && <Link href="/login" className="block text-center text-sm text-brand underline">Back to sign in</Link>}
    </form>
  );
}
