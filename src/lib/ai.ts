import "server-only";
import OpenAI from "openai";
import { z } from "zod";

/**
 * AI provider: any OpenAI-compatible API, ChatGPT by default.
 *   OPENAI_API_KEY    required to enable AI
 *   OPENAI_BASE_URL   optional: e.g. https://ai.ohack.dev/v1 (OHack gateway) or another compatible host
 *   AI_MODEL          optional: defaults to gpt-4o-mini
 *   AI_DISABLE_THINKING=true  for Qwen-style hosts that "think" slowly by default
 * Without a key every AI feature degrades to a deterministic fallback, so the app never breaks.
 */
export const aiEnabled = () => !!process.env.OPENAI_API_KEY;
export const aiModel = () => process.env.AI_MODEL || "gpt-4o-mini";

let client: OpenAI | null = null;
function ai() {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
      timeout: 45_000,
      maxRetries: 1,
    });
  }
  return client;
}

/** Pulls the first JSON object out of a model reply (handles ``` fences and <think> blocks). */
export function extractJson(text: string): unknown {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/```(?:json)?/gi, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in reply");
  return JSON.parse(cleaned.slice(start, end + 1));
}

/** Calls the model and returns parsed, schema-checked JSON, or null on any failure. */
export async function askJson<S extends z.ZodTypeAny>(schema: S, system: string, user: string, opts: { maxTokens?: number; temperature?: number; image?: string } = {}): Promise<z.output<S> | null> {
  if (!aiEnabled()) return null;
  const userContent: OpenAI.ChatCompletionUserMessageParam["content"] = opts.image
    ? [
        { type: "text", text: user },
        { type: "image_url", image_url: { url: opts.image } },
      ]
    : user;
  let jsonMode = true; // some hosts reject response_format; drop it if so
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await ai().chat.completions.create({
        model: aiModel(),
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens ?? 600,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: system + "\n\nReply with only a JSON object." },
          { role: "user", content: userContent },
        ],
        ...(process.env.AI_DISABLE_THINKING === "true" ? { chat_template_kwargs: { enable_thinking: false } } : {}),
      } as OpenAI.ChatCompletionCreateParamsNonStreaming);
      const text = res.choices[0]?.message?.content ?? "";
      const parsed = schema.safeParse(extractJson(text));
      if (parsed.success) return parsed.data;
    } catch (e) {
      if (e instanceof OpenAI.AuthenticationError || e instanceof OpenAI.NotFoundError) {
        console.error("AI provider rejected the request:", (e as Error).message);
        return null;
      }
      if (e instanceof OpenAI.BadRequestError && jsonMode) {
        jsonMode = false;
        continue;
      }
      if (attempt === 2) console.error("AI request failed:", (e as Error).message);
    }
  }
  return null;
}
