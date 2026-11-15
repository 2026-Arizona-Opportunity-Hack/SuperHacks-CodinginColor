import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { q } from "@/lib/db";

export const metadata: Metadata = { title: "My classes" };

export default async function TeachPage() {
  const user = await requireStaff(["admin", "instructor"]);
  const classes = await q(
    `SELECT c.id, c.name, c.school, c.cohort, c.join_code, u.name AS instructor,
            (SELECT count(*)::int FROM students s WHERE s.class_id = c.id) AS students,
            (SELECT count(*)::int FROM hand_raises h JOIN students s ON s.id = h.student_id WHERE s.class_id = c.id AND h.resolved_at IS NULL) AS hands,
            (SELECT count(*)::int FROM students s WHERE s.class_id = c.id AND s.last_active > now() - interval '15 minutes') AS online
     FROM classes c JOIN users u ON u.id = c.instructor_id
     WHERE $1 = 'admin' OR c.instructor_id = $2
     ORDER BY c.created_at DESC`,
    [user.role, user.id]
  );
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand">{user.organization}</p>
          <h1 className="h-display text-3xl">My classes</h1>
        </div>
        <Link href="/teach/new" className="btn-primary">
          <Plus className="h-4 w-4" aria-hidden /> New class
        </Link>
      </div>
      {classes.length === 0 ? (
        <div className="card mt-8 p-10 text-center">
          <Users className="mx-auto h-10 w-10 text-brand" aria-hidden />
          <h2 className="mt-3 font-display text-xl font-bold">No classes yet</h2>
          <p className="mt-1 text-muted">Create a class, paste your roster and share the join code. It takes about two minutes.</p>
          <Link href="/teach/new" className="btn-primary mt-5">
            Create your first class
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <li key={c.id}>
              <Link href={`/teach/${c.id}`} className="card block h-full p-5 transition hover:-translate-y-0.5 hover:border-brand/50">
                <p className="text-xs font-semibold text-muted">{c.school}</p>
                <h2 className="mt-1 font-display text-lg font-bold">{c.name}</h2>
                <p className="mt-1 text-sm text-muted">
                  {c.students} students · code <span className="font-mono font-semibold text-ink">{c.join_code}</span>
                </p>
                {user.role === "admin" && <p className="mt-1 text-xs text-muted">Instructor: {c.instructor}</p>}
                <div className="mt-3 flex gap-2">
                  {c.online > 0 && <span className="chip bg-good/15 text-good">● {c.online} online</span>}
                  {c.hands > 0 && <span className="chip bg-warn/15 text-warn">✋ {c.hands} hand{c.hands > 1 ? "s" : ""} up</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
