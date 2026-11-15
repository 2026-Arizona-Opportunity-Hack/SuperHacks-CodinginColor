"use client";
import { switchStudent } from "@/app/actions/session";
import { clearPersonalCache } from "@/components/OfflineSupport";

/** On shared lab machines, switching student also clears this student's cached lesson pages and drafts. */
export function SwitchStudent({ label }: { label: string }) {
  return (
    <form
      action={switchStudent}
      onSubmit={() => {
        clearPersonalCache();
        try {
          Object.keys(localStorage).filter((k) => k.startsWith("cic_code_") || k.startsWith("cic_ws_")).forEach((k) => localStorage.removeItem(k));
        } catch {}
      }}
    >
      <button className="text-sm text-muted underline">{label}</button>
    </form>
  );
}
