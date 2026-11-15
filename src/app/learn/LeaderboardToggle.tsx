"use client";
import { useTransition } from "react";
import { setLeaderboardVisibility } from "@/app/actions/student";

export function LeaderboardToggle({ hidden, label }: { hidden: boolean; label: string }) {
  const [pending, start] = useTransition();
  return (
    <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-muted">
      <input type="checkbox" checked={hidden} disabled={pending} onChange={(e) => start(() => setLeaderboardVisibility(e.target.checked))} />
      {label}
    </label>
  );
}
