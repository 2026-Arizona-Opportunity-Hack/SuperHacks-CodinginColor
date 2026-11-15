"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit, currentStaff, rateLimit } from "@/lib/auth";
import { one, q } from "@/lib/db";
import { ACTIVITY_KINDS, contentSchemaFor, type ActivityKind } from "@/lib/content";
import { blankDraft, canEditCurriculum, draftFromSource, insertModule, PLACEHOLDER, translateModule } from "@/lib/curriculum";
import { aiEnabled } from "@/lib/ai";

const Uuid = z.string().uuid();

async function editor() {
  const u = await currentStaff();
  if (!canEditCurriculum(u)) throw new Error("Only CIC staff can edit the curriculum");
  return u!;
}
const firstCourse = async () => (await one("SELECT id FROM courses ORDER BY created_at LIMIT 1"))!.id as string;

export type Result = { ok: true; id?: string } | { ok: false; error: string };

export async function createBlankModule(title: string, concept: string): Promise<Result> {
  const u = await editor();
  const t = z.string().trim().min(2).max(100).safeParse(title);
  if (!t.success) return { ok: false, error: "Give the module a title (2–100 characters)." };
  const c = z.string().trim().toLowerCase().max(40).parse(concept || "");
  const id = await insertModule(await firstCourse(), blankDraft(t.data, c));
  await audit(u.email, "module_create", id);
  revalidatePath("/curriculum");
  return { ok: true, id };
}

/** Worksheet / slides → draft module (unpublished) for an instructor to review and publish. */
export async function convertToModule(input: { text?: string; image?: string }): Promise<Result> {
  const u = await editor();
  if (!aiEnabled()) return { ok: false, error: "AI is not configured. Add OPENAI_API_KEY to .env to use the converter." };
  if (!rateLimit(`convert:${u.id}`, 6, 10 * 60_000)) return { ok: false, error: "Too many conversions. Try again in a few minutes." };
  const text = z.string().max(20_000).optional().parse(input.text);
  const image = input.image && /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/.test(input.image) && input.image.length < 6_000_000 ? input.image : undefined;
  if (!text?.trim() && !image) return { ok: false, error: "Paste the worksheet text or upload a photo of it." };
  const draft = await draftFromSource({ text, image });
  if (!draft) return { ok: false, error: "The AI couldn't turn that into a module. Try clearer text or a sharper photo." };
  const id = await insertModule(await firstCourse(), draft);
  await audit(u.email, "module_ai_convert", id);
  revalidatePath("/curriculum");
  return { ok: true, id };
}

export async function translateToNewModule(moduleId: string, language: string): Promise<Result> {
  const u = await editor();
  if (!aiEnabled()) return { ok: false, error: "AI is not configured. Add OPENAI_API_KEY to .env to translate." };
  if (!Uuid.safeParse(moduleId).success) return { ok: false, error: "Bad module" };
  const lang = z.enum(["Spanish", "Arabic", "French", "Hindi", "Vietnamese", "Chinese", "Portuguese"]).safeParse(language);
  if (!lang.success) return { ok: false, error: "Pick a language" };
  if (!rateLimit(`translate:${u.id}`, 6, 10 * 60_000)) return { ok: false, error: "Too many translations. Try again in a few minutes." };
  const draft = await translateModule(moduleId, lang.data);
  if (!draft) return { ok: false, error: "Translation failed. Please try again." };
  const id = await insertModule(await firstCourse(), draft);
  await audit(u.email, "module_translate", `${moduleId} → ${lang.data}`);
  revalidatePath("/curriculum");
  return { ok: true, id };
}

const ModuleMeta = z.object({
  title: z.string().trim().min(2).max(100),
  summary: z.string().trim().max(300),
  concepts: z.array(z.string().trim().toLowerCase().min(1).max(40)).max(6),
  published: z.boolean(),
});

export async function saveModule(moduleId: string, meta: unknown): Promise<Result> {
  const u = await editor();
  const m = ModuleMeta.safeParse(meta);
  if (!Uuid.safeParse(moduleId).success || !m.success) return { ok: false, error: m.success ? "Bad module" : m.error.issues[0].message };
  await q("UPDATE modules SET title=$1, summary=$2, concepts=$3, published=$4, updated_at=now() WHERE id=$5", [m.data.title, m.data.summary, m.data.concepts, m.data.published, moduleId]);
  await audit(u.email, "module_save", moduleId);
  revalidatePath("/curriculum");
  revalidatePath(`/curriculum/${moduleId}`);
  return { ok: true };
}

export async function saveActivity(activityId: string, data: { title: string; concept: string; content: unknown }): Promise<Result> {
  const u = await editor();
  if (!Uuid.safeParse(activityId).success) return { ok: false, error: "Bad activity" };
  const act = await one("SELECT a.kind, l.module_id FROM activities a JOIN lessons l ON l.id = a.lesson_id WHERE a.id = $1", [activityId]);
  if (!act) return { ok: false, error: "Not found" };
  const title = z.string().trim().min(1).max(120).safeParse(data.title);
  const concept = z.string().trim().toLowerCase().max(40).safeParse(data.concept ?? "");
  const content = contentSchemaFor(act.kind as ActivityKind).safeParse(data.content);
  if (!title.success) return { ok: false, error: "Title is required" };
  if (!content.success) {
    const i = content.error.issues[0];
    return { ok: false, error: `${i.path.join(" › ") || "content"}: ${i.message}` };
  }
  if ("questions" in content.data) {
    const bad = content.data.questions.find((qq) => qq.answer >= qq.choices.length);
    if (bad) return { ok: false, error: `Question "${bad.prompt.slice(0, 40)}" has no correct choice selected` };
  }
  await q("UPDATE activities SET title=$1, concept=$2, content=$3 WHERE id=$4", [title.data, concept.success ? concept.data : "", JSON.stringify(content.data), activityId]);
  await q("UPDATE modules SET updated_at = now() WHERE id = $1", [act.module_id]);
  await audit(u.email, "activity_save", activityId);
  revalidatePath(`/curriculum/${act.module_id}`);
  return { ok: true };
}

export async function addActivity(lessonId: string, kind: string): Promise<Result> {
  const u = await editor();
  const k = z.enum(ACTIVITY_KINDS).safeParse(kind);
  if (!Uuid.safeParse(lessonId).success || !k.success) return { ok: false, error: "Bad request" };
  const lesson = await one("SELECT module_id FROM lessons WHERE id = $1", [lessonId]);
  if (!lesson) return { ok: false, error: "Not found" };
  const [{ next }] = await q<{ next: number }>("SELECT coalesce(max(position), 0) + 1 AS next FROM activities WHERE lesson_id = $1", [lessonId]);
  const [a] = await q("INSERT INTO activities (lesson_id, position, kind, title, content) VALUES ($1,$2,$3,$4,$5) RETURNING id", [
    lessonId,
    next,
    k.data,
    `New ${k.data}`,
    JSON.stringify(PLACEHOLDER[k.data](""))
  ]);
  await audit(u.email, "activity_add", a.id);
  revalidatePath(`/curriculum/${lesson.module_id}`);
  return { ok: true, id: a.id };
}

export async function deleteActivity(activityId: string): Promise<Result> {
  const u = await editor();
  if (!Uuid.safeParse(activityId).success) return { ok: false, error: "Bad activity" };
  const act = await one("SELECT l.module_id FROM activities a JOIN lessons l ON l.id = a.lesson_id WHERE a.id = $1", [activityId]);
  await q("DELETE FROM activities WHERE id = $1", [activityId]);
  await audit(u.email, "activity_delete", activityId);
  if (act) revalidatePath(`/curriculum/${act.module_id}`);
  return { ok: true };
}

export async function moveActivity(activityId: string, dir: -1 | 1): Promise<Result> {
  await editor();
  if (!Uuid.safeParse(activityId).success) return { ok: false, error: "Bad activity" };
  const a = await one("SELECT a.id, a.lesson_id, a.position, l.module_id FROM activities a JOIN lessons l ON l.id = a.lesson_id WHERE a.id = $1", [activityId]);
  if (!a) return { ok: false, error: "Not found" };
  const other = await one(
    `SELECT id, position FROM activities WHERE lesson_id = $1 AND position ${dir < 0 ? "<" : ">"} $2 ORDER BY position ${dir < 0 ? "DESC" : "ASC"} LIMIT 1`,
    [a.lesson_id, a.position]
  );
  if (other) {
    await q("UPDATE activities SET position = $1 WHERE id = $2", [other.position, a.id]);
    await q("UPDATE activities SET position = $1 WHERE id = $2", [a.position, other.id]);
  }
  revalidatePath(`/curriculum/${a.module_id}`);
  return { ok: true };
}

export async function deleteModule(moduleId: string): Promise<Result> {
  const u = await editor();
  if (!Uuid.safeParse(moduleId).success) return { ok: false, error: "Bad module" };
  const used = await one("SELECT count(*)::int AS n FROM progress p JOIN activities a ON a.id = p.activity_id JOIN lessons l ON l.id = a.lesson_id WHERE l.module_id = $1", [moduleId]);
  if (used && used.n > 0) return { ok: false, error: "Students already have progress in this module. Unpublish it instead." };
  await q("DELETE FROM modules WHERE id = $1", [moduleId]);
  await audit(u.email, "module_delete", moduleId);
  revalidatePath("/curriculum");
  return { ok: true };
}
