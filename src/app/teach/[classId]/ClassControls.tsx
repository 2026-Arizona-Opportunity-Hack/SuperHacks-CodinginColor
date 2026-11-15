"use client";
import { useTransition } from "react";
import { Check, Lock, LockOpen, MoreHorizontal } from "lucide-react";
import { releaseSeat, removeStudent, resolveHand, setJoinOpen, setModuleAssigned } from "@/app/actions/teach";

export function ModuleToggle({ classId, moduleId, label, assigned }: { classId: string; moduleId: string; label: string; assigned: boolean }) {
  const [pending, start] = useTransition();
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/5">
      {label}
      <input type="checkbox" className="h-4 w-4" checked={assigned} disabled={pending} onChange={(e) => start(() => setModuleAssigned(classId, moduleId, e.target.checked))} />
    </label>
  );
}

export function ResolveHand({ classId, studentId }: { classId: string; studentId: string }) {
  const [pending, start] = useTransition();
  return (
    <button className="btn-ghost !min-h-[36px] !px-3 text-xs" disabled={pending} onClick={() => start(() => resolveHand(classId, studentId))}>
      <Check className="h-3.5 w-3.5" aria-hidden /> Helped
    </button>
  );
}

export function StudentActions({ classId, studentId, name }: { classId: string; studentId: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <details className="relative">
      <summary className="btn-ghost !min-h-[36px] !px-2 list-none" aria-label={`Actions for ${name}`}>
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </summary>
      <div className="card absolute end-0 z-20 mt-1 w-56 p-1 text-sm">
        <button className="w-full rounded-lg px-3 py-2 text-start hover:bg-raised" disabled={pending} onClick={() => start(() => releaseSeat(classId, studentId))}>
          Let them sign in on a new device
        </button>
        <button
          className="w-full rounded-lg px-3 py-2 text-start text-bad hover:bg-bad/10"
          disabled={pending}
          onClick={() => confirm(`Remove ${name} and all their progress?`) && start(() => removeStudent(classId, studentId))}
        >
          Remove from class
        </button>
      </div>
    </details>
  );
}

export function JoinLock({ classId, open }: { classId: string; open: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button className={`btn-ghost ${open ? "" : "!border-warn !text-warn"}`} aria-pressed={!open} disabled={pending} onClick={() => start(() => setJoinOpen(classId, !open))} title={open ? "Stop new students from joining with the code" : "Allow new students to join with the code"}>
      {open ? <LockOpen className="h-4 w-4" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />} {open ? "Joining open" : "Joining locked"}
    </button>
  );
}
