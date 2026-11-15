"use client";
import { useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { reteachPlan } from "@/app/actions/teach";
import type { Plan } from "@/lib/reteach";

export function ReteachCard({ classId, concept, pct }: { classId: string; concept: string; pct: number }) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="mt-5 rounded-2xl border border-bad/30 bg-bad/5 p-4">
      <p className="font-bold">
        🔴 Reteach <span className="capitalize text-brand">{concept}</span> tomorrow
      </p>
      <p className="text-xs text-muted">{pct}% of the class struggled with it.</p>
      {!plan ? (
        <button className="btn-primary mt-3 w-full" disabled={pending} onClick={() => start(async () => setPlan(await reteachPlan(classId, concept)))}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />} Build a 5-minute warm-up
        </button>
      ) : (
        <div className="mt-3 space-y-3 text-sm" aria-live="polite">
          <p>{plan.summary}</p>
          <p><b>Likely misconception:</b> {plan.misconception}</p>
          <div>
            <p className="font-bold">{plan.warmup.title}</p>
            <ol className="ms-5 mt-1 list-decimal space-y-1">{plan.warmup.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
          </div>
          <pre className="overflow-x-auto rounded-xl bg-surface p-3 font-mono text-xs" dir="ltr">{plan.warmup.example}</pre>
          <p><b>Exit question:</b> {plan.warmup.question}</p>
          {plan.students.length > 0 && <p><b>Check in with:</b> {plan.students.slice(0, 8).join(", ")}</p>}
          <p className="text-[11px] text-muted">{plan.source === "ai" ? "Drafted by AI from your class's struggle data. Review before using." : "Built-in plan for this concept."}</p>
        </div>
      )}
    </div>
  );
}
