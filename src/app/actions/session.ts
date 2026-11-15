"use server";
import { redirect } from "next/navigation";
import { endStaffSession, endStudentSession } from "@/lib/auth";

export async function signOut() {
  await endStaffSession();
  redirect("/");
}

export async function switchStudent() {
  await endStudentSession();
  redirect("/join");
}
