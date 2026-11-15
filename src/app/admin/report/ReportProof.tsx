"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, ShieldCheck } from "lucide-react";
import { anchorReport } from "@/app/actions/proofs";

/** Fingerprints this report's numbers and records the fingerprint on Solana, so funders can verify it later. */
export function ReportProof({ cohort }: { cohort?: string }) {
  const [res, setRes] = useState<{ id: string; signature: string | null } | null>(null);
  const [pending, start] = useTransition();
  return (
    <section className="rounded-2xl border border-dashed border-line p-4 text-sm">
      <p className="flex items-center gap-2 font-bold"><ShieldCheck className="h-4 w-4 text-good" aria-hidden /> Verifiable report</p>
      {res ? (
        <p className="mt-1">
          Fingerprint recorded{res.signature ? " on Solana" : ""}. Funders can check it at{" "}
          <Link className="font-mono text-brand underline" href={`/verify/${res.id}`}>/verify/{res.id.slice(0, 8)}…</Link>
        </p>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted">Records a SHA-256 fingerprint of these numbers on the Solana blockchain. If anyone edits a number later, verification fails. No student data goes on-chain.</p>
          <button className="btn-ghost no-print mt-2" disabled={pending} onClick={() => start(async () => setRes(await anchorReport(cohort)))}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Make this report verifiable
          </button>
        </>
      )}
    </section>
  );
}
