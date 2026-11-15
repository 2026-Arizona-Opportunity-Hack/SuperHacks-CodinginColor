import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { currentStudent } from "@/lib/auth";
import { one } from "@/lib/db";
import { forStudent } from "@/lib/content";
import { canAccessModule, journey, moduleActivities } from "@/lib/progress";
import { Player, type PlayerActivity } from "@/components/activity/Player";

export const metadata: Metadata = { title: "Module" };

export default async function ModulePage({ params, searchParams }: { params: Promise<{ moduleId: string }>; searchParams: Promise<{ a?: string }> }) {
  const student = await currentStudent();
  if (!student) redirect("/join");
  const { moduleId } = await params;
  const { a } = await searchParams;
  if (!z.string().uuid().safeParse(moduleId).success) notFound();
  if (!(await canAccessModule(student, moduleId))) redirect("/learn");

  const mod = await one("SELECT id, title, position, summary FROM modules WHERE id = $1", [moduleId]);
  if (!mod) notFound();
  const list = await moduleActivities(student.id, moduleId);
  const modules = await journey(student);
  const nextModule = modules.find((m) => m.position > mod.position && m.state === "current");

  // Everything sent to the browser goes through forStudent(): no answer keys, no solutions.
  const activities: PlayerActivity[] = list.map((x) => ({
    id: x.id,
    kind: x.kind,
    title: x.title,
    lesson: x.lesson,
    concept: x.concept,
    content: forStudent(x.kind, x.content),
    completed: x.completed,
    open: x.open,
    score: x.score,
    answer: x.kind === "pretest" || x.kind === "posttest" || x.kind === "check" || x.kind === "exit" ? null : x.answer,
  }));
  const firstOpen = activities.find((x) => x.open && !x.completed) ?? activities[0];
  const requested = activities.find((x) => x.id === a && x.open);

  return (
    <Player
      module={{ id: mod.id, title: mod.title, position: mod.position }}
      activities={activities}
      startId={(requested ?? firstOpen).id}
      nextModuleId={nextModule?.id ?? null}
    />
  );
}
