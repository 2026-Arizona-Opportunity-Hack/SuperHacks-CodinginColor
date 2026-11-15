import type { Metadata } from "next";
import { Playground } from "./Playground";

export const metadata: Metadata = { title: "Python playground", description: "Free, no-login Python in your browser with AI hints that never give the answer." };

export default function PlayPage() {
  return <Playground />;
}
