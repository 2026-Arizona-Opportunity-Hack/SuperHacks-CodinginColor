import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Staff sign in" };

export default async function LoginPage() {
  const staff = await currentStaff();
  if (staff) redirect(staff.role === "reviewer" ? "/curriculum" : staff.role === "admin" ? "/admin" : "/teach");
  return <LoginForm showDemo={process.env.SHOW_DEMO_ACCOUNTS !== "false"} />;
}
