import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Eye } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { q } from "@/lib/db";
import { canEditCurriculum } from "@/lib/curriculum";
import { aiEnabled } from "@/lib/ai";
import { NewModule, Converter } from "./CurriculumTools";

export const metadata: Metadata = { title: "Curriculum" };

export default async function CurriculumPage() {
  const user = await requireStaff();
  const editable = canEditCurriculum(user);
  const modules = await q(
    `SELECT m.id, m.position, m.title, m.summary, m.concepts, m.published, m.updated_at,
            (SELECT count(*)::int FROM lessons l JOIN activities a ON a.lesson_id = l.id WHERE l.module_id = m.id) AS activities,
            (SELECT count(*)::int FROM class_modules cm WHERE cm.module_id = m.id) AS classes
     FROM modules m ORDER BY m.position`
  );
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-brand">Python Foundations</p>
        <h1 className="h-display text-3xl">Curriculum</h1>
        <p className="mt-1 max-w-2xl text-muted">
          {editable
            ? "Edit any module and publish it without a code deploy. Students only see published modules that their teacher has assigned."
            : "Read-only teacher edition: every module with answer keys and teaching notes. Nothing you do here changes student work."}
        </p>
      </div>
      {editable && (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <NewModule />
          <Converter aiReady={aiEnabled()} />
        </div>
      )}
      <ul className="cascade grid gap-4 sm:grid-cols-2">
        {modules.map((m) => (
          <li key={m.id}>
            <Link href={`/curriculum/${m.id}`} className="card card-hover flex h-full gap-4 p-5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand/10 font-display text-lg font-extrabold text-brand">{m.position}</span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-lg font-bold">{m.title}</span>
                  {!m.published && <span className="chip bg-warn/15 text-warn">Draft</span>}
                </span>
                <span className="block text-sm text-muted">{m.summary}</span>
                <span className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted">
                  {(m.concepts as string[]).map((c) => <span key={c} className="chip bg-raised">{c}</span>)}
                  <span className="chip bg-raised"><BookOpen className="h-3 w-3" aria-hidden /> {m.activities} activities</span>
                  <span className="chip bg-raised"><Eye className="h-3 w-3" aria-hidden /> {m.classes} classes</span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
