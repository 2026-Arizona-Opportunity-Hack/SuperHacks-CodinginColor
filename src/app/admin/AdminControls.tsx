"use client";
import { useState, useTransition } from "react";
import { Copy, Loader2, Plus } from "lucide-react";
import { newApiKey, revokeApiKey, setUserRole } from "@/app/actions/admin";

type Key = { id: string; name: string; prefix: string; created_at: string; last_used_at: string | null; revoked_at: string | null };

export function ApiKeys({ keys }: { keys: Key[] }) {
  const [name, setName] = useState("Org dashboard");
  const [fresh, setFresh] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="mt-4 space-y-3">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => setFresh(await newApiKey(name))); }}>
        <label className="sr-only" htmlFor="keyname">Key name</label>
        <input id="keyname" className="input !min-h-[40px]" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn-primary shrink-0" disabled={pending || name.trim().length < 2}>{pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />} Create</button>
      </form>
      {fresh && (
        <div role="status" className="rounded-xl border border-warn/40 bg-warn/10 p-3 text-xs">
          <p className="font-bold">Copy this key now. It won&apos;t be shown again.</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 break-all font-mono">{fresh}</code>
            <button className="btn-ghost !min-h-[32px] !px-2" onClick={() => navigator.clipboard?.writeText(fresh)} aria-label="Copy key"><Copy className="h-3.5 w-3.5" aria-hidden /></button>
          </div>
        </div>
      )}
      <ul className="divide-y divide-line text-sm">
        {keys.length === 0 && <li className="py-2 text-muted">No keys yet.</li>}
        {keys.map((k) => (
          <li key={k.id} className="flex items-center justify-between gap-2 py-2">
            <span><b>{k.name}</b> <code className="font-mono text-xs text-muted">{k.prefix}…</code>
              <span className="block text-xs text-muted">{k.revoked_at ? "revoked" : k.last_used_at ? `last used ${new Date(k.last_used_at).toLocaleString()}` : "never used"}</span></span>
            {!k.revoked_at && <button className="btn-ghost !min-h-[32px] text-xs text-bad" onClick={() => start(() => revokeApiKey(k.id))}>Revoke</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RoleSelect({ userId, role, disabled }: { userId: string; role: string; disabled: boolean }) {
  const [pending, start] = useTransition();
  return (
    <select aria-label="Role" className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs" defaultValue={role} disabled={disabled || pending} onChange={(e) => start(() => setUserRole(userId, e.target.value))}>
      <option value="admin">Admin</option>
      <option value="instructor">Instructor</option>
      <option value="reviewer">Reviewer</option>
    </select>
  );
}
