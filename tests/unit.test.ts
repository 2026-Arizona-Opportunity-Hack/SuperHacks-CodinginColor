import { test } from "node:test";
import assert from "node:assert/strict";
import { forStudent, gradeQuiz } from "@/lib/content";
import { leaksSolution, fallbackHint } from "@/lib/tutor";
import { parseRoster } from "@/lib/roster";
import { csvCell } from "@/lib/csv";
import { canonical, hashOf } from "@/lib/proof";
import { summarize, type GainRow } from "@/lib/stats";
import { MODULES } from "@/lib/curriculum-seed";

test("forStudent strips answer keys and solutions", () => {
  const quiz = { intro: "", questions: [{ id: "q1", prompt: "?", choices: ["a", "b"], answer: 1, concept: "x", explanation: "because" }] };
  const safe = forStudent("posttest", quiz);
  assert.equal(JSON.stringify(safe).includes('"answer"'), false);
  assert.equal(JSON.stringify(safe).includes("because"), false);
  const code = forStudent("code", { prompt: "p", starter: "", tests: [], solution: "SECRET" });
  assert.equal(JSON.stringify(code).includes("SECRET"), false);
});

test("gradeQuiz scores on the server", () => {
  const content = { questions: [
    { id: "a", prompt: "", choices: ["x", "y"], answer: 0, concept: "", explanation: "" },
    { id: "b", prompt: "", choices: ["x", "y"], answer: 1, concept: "", explanation: "" },
  ] };
  assert.equal(gradeQuiz(content, { a: 0, b: 1 }).score, 100);
  assert.equal(gradeQuiz(content, { a: 0, b: 0 }).score, 50);
  assert.equal(gradeQuiz(content, {}).score, 0);
});

test("every seeded code exercise has tests and a reference solution", () => {
  for (const m of MODULES) {
    const code = m.lessons.flatMap((l) => l.activities).find((a) => a.kind === "code")!;
    assert.ok(code.content.tests.length > 0, m.title);
    assert.ok(code.content.solution.length > 0, m.title);
  }
});

test("hint leak check catches a pasted solution line", () => {
  const solution = "def total_of(numbers):\n    total = 0\n    for n in numbers:\n        total = total + n\n    return total";
  assert.equal(leaksSolution("Try this: total = total + n inside the loop", solution), true);
  assert.equal(leaksSolution("What happens to total each time around the loop?", solution), false);
});

test("fallback hints recognise common Python errors", () => {
  const base = { prompt: "", code: "", concept: "loops", language: "English" };
  assert.match(fallbackHint({ ...base, error: "Line 3: IndentationError: expected an indented block" }).hint, /spaces/);
  assert.match(fallbackHint({ ...base, error: "NameError: name 'totl' is not defined" }).hint, /totl/);
  assert.equal(fallbackHint({ ...base, error: "SyntaxError: invalid syntax" }).concept, "syntax");
});

test("roster parser handles SIS exports, plain lists and junk", () => {
  const sis = parseRoster("Student ID,First Name,Last Name\n1001,Ana,Lopez\n1002,Mateo,Diaz\n1003,=HYPERLINK(1),x");
  assert.deepEqual(sis.rows.map((r) => r.name), ["Ana L.", "Mateo D."]);
  assert.equal(sis.rows[0].rosterId, "1001");
  assert.equal(sis.skipped, 1);
  assert.deepEqual(parseRoster("Jayla\nDiego\n").rows.map((r) => r.name), ["Jayla", "Diego"]);
  assert.equal(parseRoster("<script>alert(1)</script>").rows.length, 0);
});

test("CSV export neutralises spreadsheet formulas", () => {
  assert.equal(csvCell("=SUM(A1)"), "'=SUM(A1)");
  assert.equal(csvCell("@cmd"), "'@cmd");
  assert.equal(csvCell('say "hi", ok'), '"say ""hi"", ok"');
  assert.equal(csvCell(42), "42");
});

test("proof hashing is stable and tamper-evident", () => {
  assert.equal(canonical({ b: 1, a: [2, { d: 3, c: 4 }] }), '{"a":[2,{"c":4,"d":3}],"b":1}');
  const doc = { student: "Ana", gain: 30 };
  assert.equal(hashOf(doc), hashOf({ gain: 30, student: "Ana" }));
  assert.notEqual(hashOf(doc), hashOf({ ...doc, gain: 31 }));
});

test("learning gain only counts students with both tests", () => {
  const row = (id: string, pre: number | null, post: number | null): GainRow => ({
    student_id: id, display_name: id, class_id: "c", class_name: "C", school: "", cohort: "", module_id: "m", module_title: "M", module_position: 1, concept: "loops", pre, post,
  });
  const [g] = summarize([row("a", 20, 60), row("b", 40, 60), row("c", 50, null)], () => "all", () => "All");
  assert.equal(g.n, 2);
  assert.equal(g.gain, 30);
});

test("every language translates every UI string and keeps {placeholders}", async () => {
  const { dictionaries, en } = await import("@/i18n/messages");
  const { LOCALES } = await import("@/i18n/config");
  for (const { code } of LOCALES) {
    const dict = dictionaries[code];
    for (const [key, value] of Object.entries(en)) {
      const t = dict[key as keyof typeof en];
      assert.ok(t, `${code} is missing ${key}`);
      for (const ph of value.match(/\{\w+\}/g) ?? []) assert.ok(t!.includes(ph), `${code} ${key} lost ${ph}`);
    }
  }
});
