import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { one, q } from "@/lib/db";
import { canEditCurriculum } from "@/lib/curriculum";
import { aiEnabled } from "@/lib/ai";
import { ModuleEditor } from "./ModuleEditor";

export const metadata: Metadata = { title: "Module" };

export default async function ModuleEditPage({ params, searchParams }: { params: Promise<{ moduleId: string }>; searchParams: Promise<{ converted?: string }> }) {
  const user = await requireStaff();
  const { moduleId } = await params;
  const { converted } = await searchParams;
  if (!z.string().uuid().safeParse(moduleId).success) notFound();
  const mod = await one("SELECT id, position, title, summary, concepts, published FROM modules WHERE id = $1", [moduleId]);
  if (!mod) notFound();
  const lessons = await q("SELECT id, title FROM lessons WHERE module_id = $1 ORDER BY position", [moduleId]);
  const acts = await q(
    "SELECT a.id, a.lesson_id, a.kind, a.title, a.concept, a.content FROM activities a JOIN lessons l ON l.id = a.lesson_id WHERE l.module_id = $1 ORDER BY l.position, a.position",
    [moduleId]
  );
  return (
    <div className="space-y-4">
      <Link href="/curriculum" className="text-sm text-muted hover:text-ink">← Curriculum</Link>
      {converted && (
        <p role="status" className="card border-accent/40 bg-accent/5 p-4 text-sm">
          ✨ AI drafted this module from your worksheet. Review each step, fix anything that's off, then tick <b>Published</b>.
        </p>
      )}
      <ModuleEditor
        readOnly={!canEditCurriculum(user)}
        aiReady={aiEnabled()}
        module={mod as any}
        lessons={lessons.map((l) => ({ id: l.id, title: l.title, activities: acts.filter((a) => a.lesson_id === l.id) as any }))}
      />
    </div>
  );
}
