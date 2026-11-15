"use client";
import { useEffect, useState } from "react";

/** Shows a SHA-256 fingerprint of the report's numbers so any later edit is detectable. */
export function ReportProof({ summary }: { summary: object }) {
  const [hash, setHash] = useState("");
  useEffect(() => {
    const data = new TextEncoder().encode(JSON.stringify(summary));
    crypto.subtle.digest("SHA-256", data).then((d) => setHash([...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("")));
  }, [summary]);
  return (
    <section className="rounded-2xl border border-dashed border-line p-4 text-xs">
      <p className="font-bold">Report fingerprint (SHA-256)</p>
      <p className="mt-1 break-all font-mono text-muted">{hash || "…"}</p>
    </section>
  );
}
