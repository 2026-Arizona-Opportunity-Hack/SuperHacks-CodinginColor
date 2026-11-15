"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Award, Loader2 } from "lucide-react";
import { claimCertificate } from "@/app/actions/proofs";

export function CertificateCard({ existingId, eligible }: { existingId: string | null; eligible: boolean }) {
  const [id, setId] = useState(existingId);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  if (!eligible && !id) return null;
  return (
    <div className="card overflow-hidden border-good/40 p-5">
      <h2 className="flex items-center gap-2 font-bold"><Award className="h-5 w-5 text-good" aria-hidden /> Certificate</h2>
      {id ? (
        <>
          <p className="mt-1 text-sm text-muted">Verified on the Solana blockchain. Share it with a college or employer.</p>
          <Link href={`/verify/${id}`} className="btn-primary mt-3 w-full">View my certificate</Link>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">You finished every assigned module! Claim a certificate anyone can verify.</p>
          <button className="btn-primary mt-3 w-full" disabled={pending} onClick={() => start(async () => {
            const r = await claimCertificate();
            if (r.ok) setId(r.id);
            else setError(r.error);
          })}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Award className="h-4 w-4" aria-hidden />} {pending ? "Recording on the blockchain…" : "Claim my certificate"}
          </button>
          {error && <p role="alert" className="mt-2 text-xs text-bad">{error}</p>}
        </>
      )}
    </div>
  );
}
