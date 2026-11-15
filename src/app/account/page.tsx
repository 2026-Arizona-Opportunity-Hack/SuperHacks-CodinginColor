import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { one, q } from "@/lib/db";
import { AccountSecurity } from "./AccountSecurity";

export const metadata: Metadata = { title: "Account security" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ setup2fa?: string }> }) {
  const me = await requireStaff(undefined, { allowWithout2fa: true });
  const { setup2fa } = await searchParams;
  const row = await one("SELECT totp_enabled, cardinality(backup_codes) AS backups, password_changed_at FROM users WHERE id = $1", [me.id]);
  const events = await q("SELECT action, target, created_at FROM audit_log WHERE actor = $1 ORDER BY id DESC LIMIT 8", [me.email]);
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-brand">{me.email}</p>
        <h1 className="h-display text-3xl">Account security</h1>
      </div>
      {setup2fa === "required" && !row?.totp_enabled && (
        <p role="alert" className="card border-warn/50 bg-warn/10 p-4 text-sm font-medium">Admins must turn on two-step verification before continuing.</p>
      )}
      <AccountSecurity totpEnabled={!!row?.totp_enabled} backupsLeft={Number(row?.backups ?? 0)} passwordChanged={String(row?.password_changed_at ?? "")} />
      <section className="card p-5" aria-labelledby="recent">
        <h2 id="recent" className="font-bold">Recent security activity</h2>
        <ul className="mt-3 space-y-1 font-mono text-xs">
          {events.map((e, i) => (
            <li key={i}><span className="text-muted">{new Date(e.created_at).toISOString().slice(0, 16).replace("T", " ")}</span> {e.action.replaceAll("_", " ")}{e.target && <span className="text-muted"> ({e.target})</span>}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">Don&apos;t recognise something? Change your password and sign out everywhere.</p>
      </section>
    </div>
  );
}
