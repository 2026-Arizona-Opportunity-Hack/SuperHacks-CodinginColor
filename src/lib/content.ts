import { z } from "zod";

/**
 * Activity content shapes, one per kind. Authors edit these in the curriculum editor.
 * Fields marked "secret" (answers, solutions, hidden tests) are removed by `forStudent()`
 * before anything is sent to a browser, and grading happens on the server.
 */

export const ACTIVITY_KINDS = ["pretest", "video", "slides", "check", "worksheet", "code", "exit", "posttest"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const QuestionSchema = z.object({
  id: z.string().min(1).max(40),
  prompt: z.string().min(1).max(1000),
  choices: z.array(z.string().min(1).max(300)).min(2).max(6),
  answer: z.number().int().min(0), // secret
  concept: z.string().max(60).default(""),
  explanation: z.string().max(600).default(""),
});
export type Question = z.infer<typeof QuestionSchema>;

export const QuizContent = z.object({
  intro: z.string().max(1000).default(""),
  questions: z.array(QuestionSchema).min(1).max(20),
});

export const VideoContent = z.object({
  url: z.string().max(500).default(""), // YouTube/Vimeo link; empty shows the transcript only
  body: z.string().max(5000).default(""), // transcript / summary in Markdown-lite
});

export const SlidesContent = z.object({
  slides: z.array(z.object({ title: z.string().max(200), body: z.string().max(3000) })).min(1).max(40),
});

export const WorksheetContent = z.object({
  intro: z.string().max(2000).default(""),
  prompts: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        prompt: z.string().min(1).max(1000),
        long: z.boolean().default(false),
      })
    )
    .min(1)
    .max(20),
});

export const CodeTestSchema = z.object({
  name: z.string().min(1).max(200), // shown to the student
  code: z.string().min(1).max(2000), // Python assert(s) run after the student's code
});
export const CodeContent = z.object({
  prompt: z.string().min(1).max(3000),
  starter: z.string().max(5000).default(""),
  tests: z.array(CodeTestSchema).min(1).max(15),
  solution: z.string().max(5000).default(""), // secret: used only to steer AI hints
});

export const contentSchemaFor = (kind: ActivityKind) =>
  ({
    pretest: QuizContent,
    posttest: QuizContent,
    check: QuizContent,
    exit: QuizContent,
    video: VideoContent,
    slides: SlidesContent,
    worksheet: WorksheetContent,
    code: CodeContent,
  })[kind];

export const isQuiz = (k: string) => k === "pretest" || k === "posttest" || k === "check" || k === "exit";

/** Strips answer keys and solutions. Everything sent to a student goes through this. */
export function forStudent(kind: string, content: any): any {
  if (isQuiz(kind)) {
    return {
      intro: content.intro ?? "",
      questions: (content.questions ?? []).map((q: Question) => ({
        id: q.id,
        prompt: q.prompt,
        choices: q.choices,
        concept: q.concept,
      })),
    };
  }
  if (kind === "code") {
    // Test code is shown so students can read what "correct" means; the solution is not.
    const { solution: _solution, ...rest } = content;
    return rest;
  }
  return content;
}

export type QuizResult = {
  score: number; // 0..100
  perQuestion: { id: string; correct: boolean; concept: string; explanation: string; answer: number }[];
};

export function gradeQuiz(content: { questions: Question[] }, answers: Record<string, number>): QuizResult {
  const perQuestion = content.questions.map((q) => ({
    id: q.id,
    correct: answers[q.id] === q.answer,
    concept: q.concept,
    explanation: q.explanation,
    answer: q.answer,
  }));
  const score = Math.round((100 * perQuestion.filter((p) => p.correct).length) / Math.max(1, perQuestion.length));
  return { score, perQuestion };
}
