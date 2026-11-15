import type { Metadata } from "next";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = { title: "Create a teacher account" };

export default function SignupPage() {
  return <SignupForm />;
}
