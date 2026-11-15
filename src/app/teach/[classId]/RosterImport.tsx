"use client";
import { useState, useTransition } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { importRoster } from "@/app/actions/teach";

export function RosterImport({ classId }: { classId: string }) {
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-xs text-good" role="status">{msg}</span>}
      <label className="btn-ghost cursor-pointer">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <FileUp className="h-4 w-4" aria-hidden />} Import roster CSV
        <input
          type="file"
          accept=".csv,text/csv,text/plain"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            if (f.size > 200_000) return setMsg("File is too large (max 200 KB).");
            start(async () => {
              const r = await importRoster(classId, await f.text());
              setMsg(r.ok ? `Added ${r.added} student${r.added === 1 ? "" : "s"}${r.skipped ? `, skipped ${r.skipped}` : ""}.` : r.error);
            });
          }}
        />
      </label>
    </div>
  );
}
