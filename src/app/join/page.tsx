import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentStudent } from "@/lib/auth";
import { JoinFlow } from "./JoinFlow";

export const metadata: Metadata = { title: "Join a class" };

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  if (await currentStudent()) redirect("/learn");
  const { code } = await searchParams;
  return <JoinFlow initialCode={(code ?? "").slice(0, 10)} />;
}
