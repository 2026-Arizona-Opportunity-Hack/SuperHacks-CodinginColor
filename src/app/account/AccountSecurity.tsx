"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, LogOut, ShieldCheck, ShieldOff, Smartphone } from "lucide-react";
import { beginTotpSetup, changePassword, confirmTotpSetup, disableTotp, signOutEverywhere } from "@/app/actions/account";

export function AccountSecurity({ totpEnabled, backupsLeft, passwordChanged }: { totpEnabled: boolean; backupsLeft: number; passwordChanged: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [pw, setPw] = useState({ current: "", next: "" });
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [setup, setSetup] = useState<{ qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [totpMsg, setTotpMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [backups, setBackups] = useState<string[] | null>(null);

  return (
    <>
      <section className="card space-y-4 p-5" aria-labelledby="tfa">
        <h2 id="tfa" className="flex items-center gap-2 font-bold">
          {totpEnabled ? <ShieldCheck className="h-5 w-5 text-good" aria-hidden /> : <Smartphone className="h-5 w-5 text-brand" aria-hidden />} Two-step verification
          <span className={`chip ${totpEnabled ? "bg-good/15 text-good" : "bg-raised text-muted"}`}>{totpEnabled ? "On" : "Off"}</span>
        </h2>
        <p className="text-sm text-muted">
          After your password, you&apos;ll also enter a 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password, Authy…). A stolen password alone won&apos;t get anyone into student data.
        </p>

        {backups && (
          <div role="status" className="rounded-xl border border-warn/50 bg-warn/10 p-4 text-sm">
            <p className="font-bold">Save these backup codes now. They won&apos;t be shown again.</p>
            <p className="text-xs text-muted">Each works once if you lose your phone.</p>
            <ul className="mt-2 grid grid-cols-2 gap-1 font-mono">{backups.map((b) => <li key={b}>{b}</li>)}</ul>
          </div>
        )}

        {!totpEnabled && !setup && (
          <button className="btn-primary" disabled={pending} onClick={() => start(async () => setSetup(await beginTotpSetup()))}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />} Turn on two-step verification
          </button>
        )}

        {setup && !totpEnabled && (
          <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
            <div className="h-40 w-40 rounded-xl bg-white p-1" role="img" aria-label="QR code to add CIC Learn to your authenticator app" dangerouslySetInnerHTML={{ __html: setup.qr }} />
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  const r = await confirmTotpSetup(code);
                  if (r.ok) {
                    setBackups(r.backupCodes);
                    setSetup(null);
                    setTotpMsg({ ok: true, text: "Two-step verification is on." });
                    router.refresh();
                  } else setTotpMsg({ ok: false, text: r.error });
                });
              }}
            >
              <p className="text-sm">1. Scan the QR code with your authenticator app.</p>
              <p className="text-xs text-muted">Can&apos;t scan? Enter this key: <code className="break-all font-mono">{setup.secret}</code></p>
              <label className="label !mt-3" htmlFor="totp">2. Enter the 6-digit code it shows</label>
              <div className="flex gap-2">
                <input id="totp" className="input font-mono tracking-[0.3em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
                <button className="btn-primary shrink-0" disabled={pending || code.length !== 6}>Confirm</button>
              </div>
            </form>
          </div>
        )}

        {totpEnabled && !backups && (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const r = await disableTotp(code);
                setTotpMsg(r.ok ? { ok: true, text: r.message ?? "" } : { ok: false, text: r.error });
                if (r.ok) router.refresh();
              });
            }}
          >
            <p className="w-full text-xs text-muted">{backupsLeft} backup code{backupsLeft === 1 ? "" : "s"} left.</p>
            <div>
              <label className="label" htmlFor="totp-off">Code from your app</label>
              <input id="totp-off" className="input w-40 font-mono" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            </div>
            <button className="btn-ghost text-bad" disabled={pending || code.length !== 6}><ShieldOff className="h-4 w-4" aria-hidden /> Turn off</button>
          </form>
        )}
        {totpMsg && <p role="status" className={`text-sm ${totpMsg.ok ? "text-good" : "text-bad"}`}>{totpMsg.text}</p>}
      </section>

      <section className="card p-5" aria-labelledby="pw">
        <h2 id="pw" className="flex items-center gap-2 font-bold"><KeyRound className="h-5 w-5 text-brand" aria-hidden /> Password</h2>
        {passwordChanged && <p className="text-xs text-muted">Last changed {new Date(passwordChanged).toLocaleDateString()}</p>}
        <form
          className="mt-3 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await changePassword(pw.current, pw.next);
              setPwMsg(r.ok ? { ok: true, text: r.message ?? "Saved" } : { ok: false, text: r.error });
              if (r.ok) setPw({ current: "", next: "" });
            });
          }}
        >
          <div>
            <label className="label" htmlFor="pw-cur">Current password</label>
            <input id="pw-cur" type="password" autoComplete="current-password" className="input" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required />
          </div>
          <div>
            <label className="label" htmlFor="pw-new">New password</label>
            <input id="pw-new" type="password" autoComplete="new-password" minLength={12} className="input" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required aria-describedby="pw-rules" />
          </div>
          <p id="pw-rules" className="text-xs text-muted sm:col-span-2">12+ characters; common passwords and ones containing your name or email are refused. Changing it signs out your other devices.</p>
          <button className="btn-primary w-fit" disabled={pending}>Change password</button>
          {pwMsg && <p role="status" className={`self-center text-sm ${pwMsg.ok ? "text-good" : "text-bad"}`}>{pwMsg.text}</p>}
        </form>
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="font-bold">Sign out everywhere</h2>
          <p className="text-sm text-muted">Ends every session on every device, including this one.</p>
        </div>
        <form action={signOutEverywhere}>
          <button className="btn-ghost text-bad"><LogOut className="h-4 w-4" aria-hidden /> Sign out all devices</button>
        </form>
      </section>
    </>
  );
}
