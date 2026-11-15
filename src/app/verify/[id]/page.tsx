import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { CheckCircle2, ExternalLink, ShieldAlert, ShieldCheck } from "lucide-react";
import { explorerTx, verifyProof } from "@/lib/proof";
import { Logo } from "@/components/Logo";
import { PrintButton } from "@/app/teach/[classId]/codes/PrintButton";

export const metadata: Metadata = { title: "Verify" };
export const dynamic = "force-dynamic";

/** Public verification page: anyone (a college, employer, funder) can check a certificate or report. */
export default async function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const v = await verifyProof(id);
  if (!v) notFound();
  const p = v.proof.payload as any;
  const ok = v.intact && (v.onChain === "match" || v.onChain === "not_anchored");
  const isCert = v.proof.kind === "certificate";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {isCert ? (
        <article className="relative overflow-hidden rounded-3xl border-4 border-brand/20 bg-surface p-8 text-center shadow-card sm:p-12">
          <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-brand to-accent" />
          <Logo className="mx-auto h-14 w-14" />
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-muted">{p.issuer} certifies that</p>
          <h1 className="h-display mt-3 text-4xl sm:text-5xl">{p.student}</h1>
          <p className="mt-3 text-muted">completed <b className="text-ink">{p.course}</b>{p.school && <> at {p.school}</>}</p>
          <ul className="mx-auto mt-6 grid max-w-md gap-2 text-start text-sm">
            {p.modules?.map((m: any) => (
              <li key={m.title} className="flex items-center justify-between rounded-xl bg-raised px-3 py-2">
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-good" aria-hidden /> {m.title}</span>
                {m.gain != null && <span className="font-mono text-xs text-good">+{m.gain} pts</span>}
              </li>
            ))}
          </ul>
          {p.average_learning_gain != null && <p className="mt-4 text-sm">Average learning gain: <b>+{p.average_learning_gain} points</b></p>}
          <p className="mt-6 text-xs text-muted">Issued {p.issued_on}</p>
        </article>
      ) : (
        <article className="card p-8">
          <p className="text-sm font-semibold text-brand">Coding in Color</p>
          <h1 className="h-display text-3xl">Program outcomes report · {p.scope}</h1>
          {p.learning_gain && <p className="mt-3 text-lg">Average learning gain <b>+{p.learning_gain.gain} points</b> ({p.learning_gain.pre} → {p.learning_gain.post}, n={p.learning_gain.n})</p>}
          <ul className="mt-4 space-y-1 text-sm">{p.by_concept?.map((c: any) => <li key={c.label}><b className="capitalize">{c.label}</b>: +{c.gain} pts (n={c.n})</li>)}</ul>
          <p className="mt-4 text-xs text-muted">Generated {p.generated_at}</p>
        </article>
      )}

      <section className={`card p-5 ${ok ? "border-good/40" : "border-bad/40"}`} aria-labelledby="ver">
        <h2 id="ver" className={`flex items-center gap-2 font-bold ${ok ? "text-good" : "text-bad"}`}>
          {ok ? <ShieldCheck className="h-5 w-5" aria-hidden /> : <ShieldAlert className="h-5 w-5" aria-hidden />}
          {ok ? "Verified: this document has not been changed" : "Warning: this document does not match its fingerprint"}
        </h2>
        <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-[160px_1fr]">
          <dt className="text-muted">SHA-256 fingerprint</dt><dd className="break-all font-mono">{v.recomputed}</dd>
          <dt className="text-muted">Matches stored hash</dt><dd>{v.intact ? "Yes" : "No"}</dd>
          <dt className="text-muted">On-chain record</dt>
          <dd>
            {v.onChain === "match" && <>Matches the memo on Solana {v.proof.cluster} · <a className="inline-flex items-center gap-1 font-semibold text-brand underline" href={explorerTx(v.proof.signature)} target="_blank" rel="noreferrer">view transaction <ExternalLink className="h-3 w-3" aria-hidden /></a></>}
            {v.onChain === "mismatch" && "The Solana memo does NOT match this document."}
            {v.onChain === "not_anchored" && "Not anchored on a blockchain (anchoring is disabled on this server)."}
            {v.onChain === "unreachable" && "Couldn't reach Solana right now. Try again later."}
          </dd>
        </dl>
        <p className="mt-3 text-xs text-muted">Only this fingerprint is written to the blockchain, never names or scores. Change any detail above and the fingerprint changes.</p>
      </section>
      <div className="no-print flex justify-center"><PrintButton /></div>
    </div>
  );
}
