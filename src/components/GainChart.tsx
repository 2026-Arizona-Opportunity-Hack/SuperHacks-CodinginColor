"use client";
import { useState } from "react";
import { Table2, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

export type GainDatum = { label: string; pre: number; post: number; gain: number; n: number };

/**
 * Pre vs post scores per group, as paired horizontal bars on one 0–100 axis.
 * Identity is never color-alone: legend + direct value labels + a table view.
 */
export function GainChart({ title, data }: { title: string; data: GainDatum[] }) {
  const [table, setTable] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  if (data.length === 0) return <p className="text-sm text-muted">No groups with both a pre-test and a post-test yet.</p>;
  return (
    <figure>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <figcaption className="font-bold">{title}</figcaption>
        <div className="flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--chart-pre)" }} aria-hidden /> Pre-test</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--chart-post)" }} aria-hidden /> Post-test</span>
          <button className="btn-ghost !min-h-[32px] !px-2 text-xs" onClick={() => setTable((t) => !t)} aria-pressed={table}>
            {table ? <BarChart3 className="h-3.5 w-3.5" aria-hidden /> : <Table2 className="h-3.5 w-3.5" aria-hidden />} {table ? "Chart" : "Table"}
          </button>
        </div>
      </div>
      {table ? (
        <table className="mt-3 w-full text-sm">
          <thead className="text-xs text-muted">
            <tr><th scope="col" className="py-1 text-start">Group</th><th scope="col" className="text-end">Pre</th><th scope="col" className="text-end">Post</th><th scope="col" className="text-end">Gain</th><th scope="col" className="text-end">Students</th></tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label} className="border-t border-line">
                <th scope="row" className="py-1.5 text-start font-medium capitalize">{d.label}</th>
                <td className="text-end">{d.pre}</td><td className="text-end">{d.post}</td>
                <td className="text-end font-bold">{d.gain >= 0 ? "+" : ""}{d.gain}</td><td className="text-end text-muted">{d.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <ul className="mt-4 space-y-4" role="list">
          {data.map((d) => (
            <li
              key={d.label}
              className={`rounded-lg p-1 transition ${hover === d.label ? "bg-raised" : ""}`}
              onMouseEnter={() => setHover(d.label)}
              onMouseLeave={() => setHover(null)}
              title={`${d.label}: pre ${d.pre} → post ${d.post} (${d.gain >= 0 ? "+" : ""}${d.gain} pts, ${d.n} students)`}
            >
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-semibold capitalize">{d.label}</span>
                <span className="font-bold">{d.gain >= 0 ? "+" : ""}{d.gain} pts <span className="text-xs font-normal text-muted">· n={d.n}</span></span>
              </div>
              <div className="mt-1.5 space-y-0.5" aria-hidden>
                {(["pre", "post"] as const).map((k) => (
                  <div key={k} className="flex items-center gap-2">
                    <div className="h-3 flex-1 overflow-hidden rounded-e bg-raised">
                      <motion.div
                        className="h-full rounded-e"
                        style={{ background: `var(--chart-${k})` }}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${d[k]}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, delay: k === "post" ? 0.25 : 0, ease: [0.2, 0.7, 0.2, 1] }}
                      />
                    </div>
                    <span className="w-8 text-end font-mono text-xs text-muted">{d[k]}</span>
                  </div>
                ))}
              </div>
              <span className="sr-only">Pre-test {d.pre}, post-test {d.post}, gain {d.gain} points, {d.n} students.</span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}
