import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { rateLimit } from "@/lib/auth";
import { socraticHint } from "@/lib/tutor";
import { jsonError, readJson, sameOrigin } from "@/lib/http";
import { getLocale } from "@/i18n/server";
import { languageName } from "@/i18n/config";

const Body = z.object({ code: z.string().max(20_000), error: z.string().max(2000).optional(), question: z.string().max(500).optional() });

/** Hints for the no-login playground: same Socratic tutor, rate-limited per IP, nothing stored. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError(403, "Bad origin");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`playhint:${ip}`, 6, 60_000)) return jsonError(429, "Take a minute to try the last hint first 🙂");
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await readJson(req));
  } catch {
    return jsonError(400, "Invalid request");
  }
  const r = await socraticHint({
    prompt: "Free practice in the playground: the student is writing their own program.",
    code: body.code,
    error: body.error,
    question: body.question,
    concept: "",
    language: languageName(await getLocale()),
  });
  return NextResponse.json({ hint: r.hint });
}
