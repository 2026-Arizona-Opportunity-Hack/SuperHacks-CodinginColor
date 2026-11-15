import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { currentStaff, currentStudent, rateLimit } from "@/lib/auth";
import { ChatSchema, helperReply } from "@/lib/assistant";
import { jsonError, readJson, sameOrigin } from "@/lib/http";
import { getLocale } from "@/i18n/server";
import { languageName } from "@/i18n/config";

/** CIC Helper chat endpoint. Stateless: conversations are not stored. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError(403, "Bad origin");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!(await rateLimit(`helper:${ip}`, 12, 60_000))) return jsonError(429, "You're sending messages quickly. Wait a moment and try again.");
  let body;
  try {
    body = ChatSchema.parse(await readJson(req, 20_000));
  } catch {
    return jsonError(400, "Invalid message");
  }
  const [staff, student] = await Promise.all([currentStaff(), currentStudent()]);
  const role = staff ? `${staff.role} (staff)` : student ? "a student" : "a visitor who is not signed in";
  const out = await helperReply(body, { role, language: languageName(await getLocale()) });
  return NextResponse.json({ reply: out.reply });
}
