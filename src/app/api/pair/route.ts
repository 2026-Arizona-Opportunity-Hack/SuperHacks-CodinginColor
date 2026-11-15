import { NextResponse } from "next/server";
import { z } from "zod";
import { currentStudent, rateLimit } from "@/lib/auth";
import { one, q } from "@/lib/db";
import { activityWithModule, canAccessModule } from "@/lib/progress";
import { jsonError, readJson, sameOrigin } from "@/lib/http";

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("create"), activityId: z.string().uuid(), content: z.string().max(20_000) }),
  z.object({ op: z.literal("join"), code: z.string().regex(/^[A-Z0-9]{5}$/) }),
  z.object({ op: z.literal("sync"), code: z.string().regex(/^[A-Z0-9]{5}$/), content: z.string().max(20_000).optional(), version: z.number().int().min(0) }),
]);

const roomCode = () => Array.from({ length: 5 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");

/**
 * Pair programming over short polling: both partners sync every ~1.5s; the newest edit wins.
 * Rooms are limited to students of the same class.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError(403, "Bad origin");
  const student = await currentStudent();
  if (!student) return jsonError(401, "Join a class first");
  if (!await rateLimit(`pair:${student.id}`, 120, 60_000)) return jsonError(429, "Too many requests");
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await readJson(req, 30_000));
  } catch {
    return jsonError(400, "Invalid request");
  }

  if (body.op === "create") {
    const act = await activityWithModule(body.activityId);
    if (!act || act.kind !== "code" || !(await canAccessModule(student, act.module_id))) return jsonError(403, "Not available");
    const code = roomCode();
    await q("INSERT INTO pair_rooms (code, class_id, activity_id, content, version, updated_by) VALUES ($1,$2,$3,$4,1,$5)", [code, student.class_id, act.id, body.content, student.id]);
    return NextResponse.json({ code, version: 1, activityId: act.id });
  }

  const room = await one("SELECT * FROM pair_rooms WHERE code = $1 AND class_id = $2 AND updated_at > now() - interval '1 day'", [body.code, student.class_id]);
  if (!room) return jsonError(404, "No partner session with that code in your class");

  if (body.op === "join") return NextResponse.json({ code: room.code, content: room.content, version: room.version, activityId: room.activity_id });

  if (body.content !== undefined && body.content !== room.content) {
    const [u] = await q(
      "UPDATE pair_rooms SET content = $1, version = version + 1, updated_by = $2, updated_at = now() WHERE code = $3 RETURNING version",
      [body.content, student.id, room.code]
    );
    return NextResponse.json({ version: u.version, content: body.content, changed: false });
  }
  const partner = room.updated_by && room.updated_by !== student.id ? await one("SELECT display_name FROM students WHERE id = $1", [room.updated_by]) : null;
  return NextResponse.json({ version: room.version, content: room.content, changed: room.version > body.version, partner: partner?.display_name ?? null });
}
