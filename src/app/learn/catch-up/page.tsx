import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentStudent } from "@/lib/auth";
import { placementQuestions } from "@/app/actions/placement";
import { CatchUp } from "./CatchUp";

export const metadata: Metadata = { title: "Catch-up check" };

export default async function CatchUpPage() {
  if (!(await currentStudent())) redirect("/join");
  const sets = await placementQuestions();
  if (sets.length === 0) redirect("/learn");
  // Strip answer keys before sending to the browser.
  const safe = sets.map((s) => ({ ...s, questions: s.questions.map(({ id, prompt, choices }) => ({ id, prompt, choices })) }));
  return <CatchUp sets={safe} />;
}
