import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { canManageClass, requireStaff } from "@/lib/auth";
import { one, q } from "@/lib/db";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = { title: "Resume codes" };

/** Printable cut-out cards: class code + each student's resume code, for kids without a fixed device. */
export default async function CodesPage({ params }: { params: Promise<{ classId: string }> }) {
  const user = await requireStaff(["admin", "instructor"]);
  const { classId } = await params;
  if (!z.string().uuid().safeParse(classId).success || !(await canManageClass(user, classId))) notFound();
  const cls = await one("SELECT name, join_code FROM classes WHERE id = $1", [classId]);
  const students = await q("SELECT display_name, resume_code FROM students WHERE class_id = $1 ORDER BY display_name", [classId]);
  return (
    <div>
      <div className="no-print mb-6 flex items-center justify-between">
        <h1 className="h-display text-2xl">Resume codes · {cls?.name}</h1>
        <PrintButton />
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {students.map((s) => (
          <li key={s.resume_code} className="rounded-xl border-2 border-dashed border-line p-4 text-center">
            <p className="font-bold">{s.display_name}</p>
            <p className="mt-1 text-xs text-muted">Class code</p>
            <p className="font-mono font-bold">{cls?.join_code}</p>
            <p className="mt-1 text-xs text-muted">Your resume code</p>
            <p className="font-mono text-xl font-bold tracking-widest">{s.resume_code}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
