import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { q } from "@/lib/db";
import { NewClassForm } from "./NewClassForm";

export const metadata: Metadata = { title: "New class" };

export default async function NewClassPage() {
  const user = await requireStaff(["admin", "instructor"]);
  const modules = await q("SELECT id, position, title, summary FROM modules WHERE published ORDER BY position");
  return <NewClassForm modules={modules as any} organization={user.organization} />;
}
