"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, CheckCircle2, ChevronDown, Copy, Languages, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { addActivity, deleteActivity, deleteModule, duplicateModule, moveActivity, saveActivity, saveModule, translateToNewModule } from "@/app/actions/curriculum";
import { ACTIVITY_KINDS } from "@/lib/content";
import { CodeEditor } from "@/components/CodeEditor";

type Activity = { id: string; lesson_id: string; kind: string; title: string; concept: string; content: any };
type Lesson = { id: string; title: string; activities: Activity[] };
type Mod = { id: string; position: number; title: string; summary: string; concepts: string[]; published: boolean };

const KIND_LABEL: Record<string, string> = {
  pretest: "Pretest",
  video: "Video",
  slides: "Slides",
  check: "Check for understanding",
  worksheet: "Worksheet",
  code: "Code exercise",
  exit: "Exit question",
  posttest: "Posttest",
};

export function ModuleEditor({ module, lessons, readOnly, aiReady }: { module: Mod; lessons: Lesson[]; readOnly: boolean; aiReady: boolean }) {
  const router = useRouter();
  const [meta, setMeta] = useState({ ...module, concepts: module.concepts.join(", ") });
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const [lang, setLang] = useState("Spanish");

  const save = () =>
    start(async () => {
      const r = await saveModule(module.id, { title: meta.title, summary: meta.summary, concepts: meta.concepts.split(",").map((c) => c.trim()).filter(Boolean), published: meta.published });
      setMsg(r.ok ? "Saved ✓" : r.error);
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <fieldset disabled={readOnly || pending} className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="text-sm font-semibold text-muted">Module {module.position}{readOnly && " · read-only teacher edition"}</p>
            {!readOnly && (
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" className="h-4 w-4" checked={meta.published} onChange={(e) => setMeta({ ...meta, published: e.target.checked })} /> Published
              </label>
            )}
          </div>
          <div>
            <label className="label" htmlFor="m-title">Title</label>
            <input id="m-title" className="input text-lg font-bold" maxLength={100} value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <div>
              <label className="label" htmlFor="m-summary">Summary</label>
              <input id="m-summary" className="input" maxLength={300} value={meta.summary} onChange={(e) => setMeta({ ...meta, summary: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="m-concepts">Concepts (comma-separated)</label>
              <input id="m-concepts" className="input" value={meta.concepts} onChange={(e) => setMeta({ ...meta, concepts: e.target.value })} />
            </div>
          </div>
        </fieldset>
        {!readOnly && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button className="btn-primary" onClick={save} disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />} Save module</button>
            <span className="text-sm text-muted" role="status">{msg}</span>
            <div className="ms-auto flex items-center gap-2">
              <label className="sr-only" htmlFor="tr-lang">Translate to</label>
              <select id="tr-lang" className="rounded-xl border border-line bg-surface px-2 py-2 text-sm" value={lang} onChange={(e) => setLang(e.target.value)}>
                {["Spanish", "Arabic", "French", "Hindi", "Vietnamese", "Chinese", "Portuguese"].map((l) => <option key={l}>{l}</option>)}
              </select>
              <button
                className="btn-ghost"
                disabled={pending || !aiReady}
                title={aiReady ? "Creates a translated copy as a draft" : "Add OPENAI_API_KEY to enable"}
                onClick={() => start(async () => {
                  setMsg("Translating… (about 30–60 seconds)");
                  const r = await translateToNewModule(module.id, lang);
                  if (r.ok) router.push(`/curriculum/${r.id}`);
                  else setMsg(r.error);
                })}
              >
                <Languages className="h-4 w-4" aria-hidden /> Translate
              </button>
              <button
                className="btn-ghost"
                disabled={pending}
                title="Copy this module into a new draft you can adapt"
                onClick={() => start(async () => {
                  const r = await duplicateModule(module.id);
                  if (r.ok) router.push(`/curriculum/${r.id}`);
                  else setMsg(r.error);
                })}
              >
                <Copy className="h-4 w-4" aria-hidden /> Remix
              </button>
              <button
                className="btn-ghost text-bad"
                disabled={pending}
                onClick={() => confirm("Delete this module? This can't be undone.") && start(async () => {
                  const r = await deleteModule(module.id);
                  if (r.ok) router.push("/curriculum");
                  else setMsg(r.error);
                })}
              >
                <Trash2 className="h-4 w-4" aria-hidden /> Delete
              </button>
            </div>
          </div>
        )}
      </section>

      {lessons.map((l) => (
        <section key={l.id} aria-labelledby={`l-${l.id}`} className="space-y-3">
          <h2 id={`l-${l.id}`} className="font-display text-xl font-bold">{l.title}</h2>
          {l.activities.map((a, i) => (
            <ActivityCard key={a.id} activity={a} readOnly={readOnly} first={i === 0} last={i === l.activities.length - 1} />
          ))}
          {!readOnly && <AddActivity lessonId={l.id} />}
        </section>
      ))}
    </div>
  );
}

function AddActivity({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const [kind, setKind] = useState("check");
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor={`add-${lessonId}`}>Activity type</label>
      <select id={`add-${lessonId}`} className="rounded-xl border border-line bg-surface px-2 py-2 text-sm" value={kind} onChange={(e) => setKind(e.target.value)}>
        {ACTIVITY_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
      </select>
      <button className="btn-ghost" disabled={pending} onClick={() => start(async () => { await addActivity(lessonId, kind); router.refresh(); })}>
        <Plus className="h-4 w-4" aria-hidden /> Add activity
      </button>
    </div>
  );
}

function ActivityCard({ activity, readOnly, first, last }: { activity: Activity; readOnly: boolean; first: boolean; last: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(activity.title);
  const [concept, setConcept] = useState(activity.concept);
  const [content, setContent] = useState<any>(activity.content);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="card">
      <div className="flex items-center gap-2 p-4">
        <button className="flex flex-1 items-center gap-3 text-start" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <span className="chip bg-brand/10 text-brand">{KIND_LABEL[activity.kind]}</span>
          <span className="font-semibold">{title}</span>
          <ChevronDown className={`ms-auto h-4 w-4 transition ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
        {!readOnly && (
          <>
            <button className="btn-ghost !min-h-[36px] !px-2" disabled={first || pending} aria-label="Move up" onClick={() => start(async () => { await moveActivity(activity.id, -1); router.refresh(); })}><ArrowUp className="h-4 w-4" aria-hidden /></button>
            <button className="btn-ghost !min-h-[36px] !px-2" disabled={last || pending} aria-label="Move down" onClick={() => start(async () => { await moveActivity(activity.id, 1); router.refresh(); })}><ArrowDown className="h-4 w-4" aria-hidden /></button>
          </>
        )}
      </div>
      {open && (
        <div className="border-t border-line p-5">
          <fieldset disabled={readOnly || pending} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <div><label className="label" htmlFor={`t-${activity.id}`}>Title</label><input id={`t-${activity.id}`} className="input" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div><label className="label" htmlFor={`c-${activity.id}`}>Concept</label><input id={`c-${activity.id}`} className="input" maxLength={40} value={concept} onChange={(e) => setConcept(e.target.value)} /></div>
            </div>
            <ContentForm kind={activity.kind} content={content} onChange={setContent} id={activity.id} />
          </fieldset>
          {!readOnly && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button className="btn-primary" disabled={pending} onClick={() => start(async () => {
                const r = await saveActivity(activity.id, { title, concept, content });
                setMsg(r.ok ? { ok: true, text: "Saved. Students see it on their next visit." } : { ok: false, text: r.error });
              })}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />} Save
              </button>
              <button className="btn-ghost text-bad" disabled={pending} onClick={() => confirm("Delete this activity?") && start(async () => { await deleteActivity(activity.id); router.refresh(); })}>
                <Trash2 className="h-4 w-4" aria-hidden /> Delete
              </button>
              {msg && <span role="status" className={`flex items-center gap-1 text-sm ${msg.ok ? "text-good" : "text-bad"}`}>{msg.ok && <CheckCircle2 className="h-4 w-4" aria-hidden />}{msg.text}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Per-kind content forms ──

function ContentForm({ kind, content, onChange, id }: { kind: string; content: any; onChange: (c: any) => void; id: string }) {
  const set = (patch: object) => onChange({ ...content, ...patch });
  if (["pretest", "posttest", "check", "exit"].includes(kind)) return <QuizForm content={content} onChange={onChange} id={id} />;
  if (kind === "video")
    return (
      <div className="space-y-3">
        <div><label className="label" htmlFor={`v-${id}`}>YouTube or Vimeo link</label><input id={`v-${id}`} className="input" placeholder="https://www.youtube.com/watch?v=…" value={content.url ?? ""} onChange={(e) => set({ url: e.target.value })} /></div>
        <div><label className="label" htmlFor={`vb-${id}`}>Summary / transcript (shown under the video; **bold** and `code` work)</label><textarea id={`vb-${id}`} className="input min-h-[140px]" value={content.body ?? ""} onChange={(e) => set({ body: e.target.value })} /></div>
      </div>
    );
  if (kind === "slides")
    return (
      <ListEditor
        items={content.slides ?? []}
        onChange={(slides) => set({ slides })}
        blank={{ title: "New slide", body: "" }}
        label="slide"
        render={(s, upd, n) => (
          <div className="space-y-2">
            <input aria-label={`Slide ${n + 1} title`} className="input font-semibold" value={s.title} onChange={(e) => upd({ ...s, title: e.target.value })} />
            <textarea aria-label={`Slide ${n + 1} body`} className="input min-h-[90px] font-mono text-sm" value={s.body} onChange={(e) => upd({ ...s, body: e.target.value })} />
          </div>
        )}
      />
    );
  if (kind === "worksheet")
    return (
      <div className="space-y-3">
        <div><label className="label" htmlFor={`wi-${id}`}>Intro</label><input id={`wi-${id}`} className="input" value={content.intro ?? ""} onChange={(e) => set({ intro: e.target.value })} /></div>
        <ListEditor
          items={content.prompts ?? []}
          onChange={(prompts) => set({ prompts: prompts.map((p: any, i: number) => ({ ...p, id: p.id || `w${i + 1}` })) })}
          blank={{ id: "", prompt: "", long: false }}
          label="prompt"
          render={(p, upd, n) => (
            <div className="flex flex-wrap items-center gap-3">
              <input aria-label={`Prompt ${n + 1}`} className="input flex-1" value={p.prompt} onChange={(e) => upd({ ...p, prompt: e.target.value })} />
              <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={p.long} onChange={(e) => upd({ ...p, long: e.target.checked })} /> Long answer</label>
            </div>
          )}
        />
      </div>
    );
  if (kind === "code")
    return (
      <div className="space-y-4">
        <div><label className="label" htmlFor={`cp-${id}`}>Exercise prompt</label><textarea id={`cp-${id}`} className="input min-h-[90px]" value={content.prompt ?? ""} onChange={(e) => set({ prompt: e.target.value })} /></div>
        <div><p className="label">Starter code</p><CodeEditor value={content.starter ?? ""} onChange={(v) => set({ starter: v })} label="starter code" minHeight="120px" /></div>
        <div>
          <p className="label">Tests (Python asserts, run after the student&apos;s code; the name is shown to students)</p>
          <ListEditor
            items={content.tests ?? []}
            onChange={(tests) => set({ tests })}
            blank={{ name: "", code: "assert " }}
            label="test"
            render={(t, upd, n) => (
              <div className="space-y-2">
                <input aria-label={`Test ${n + 1} name`} className="input" placeholder="adds [1, 2, 3]" value={t.name} onChange={(e) => upd({ ...t, name: e.target.value })} />
                <input aria-label={`Test ${n + 1} code`} className="input font-mono text-sm" dir="ltr" value={t.code} onChange={(e) => upd({ ...t, code: e.target.value })} />
              </div>
            )}
          />
        </div>
        <div><p className="label">Reference solution (never shown to students; guides AI hints)</p><CodeEditor value={content.solution ?? ""} onChange={(v) => set({ solution: v })} label="solution" minHeight="100px" /></div>
      </div>
    );
  return null;
}

function QuizForm({ content, onChange, id }: { content: any; onChange: (c: any) => void; id: string }) {
  return (
    <div className="space-y-3">
      <div><label className="label" htmlFor={`qi-${id}`}>Intro (optional)</label><input id={`qi-${id}`} className="input" value={content.intro ?? ""} onChange={(e) => onChange({ ...content, intro: e.target.value })} /></div>
      <ListEditor
        items={content.questions ?? []}
        onChange={(questions) => onChange({ ...content, questions: questions.map((q: any, i: number) => ({ ...q, id: q.id || `q${i + 1}-${Date.now() % 1000}` })) })}
        blank={{ id: "", prompt: "", choices: ["", ""], answer: 0, concept: "", explanation: "" }}
        label="question"
        render={(q, upd, n) => (
          <div className="space-y-2">
            <input aria-label={`Question ${n + 1}`} className="input font-semibold" placeholder="Question" value={q.prompt} onChange={(e) => upd({ ...q, prompt: e.target.value })} />
            <fieldset className="space-y-1.5">
              <legend className="text-xs text-muted">Choices: select the correct one</legend>
              {q.choices.map((c: string, ci: number) => (
                <div key={ci} className="flex items-center gap-2">
                  <input type="radio" name={`ans-${id}-${n}`} aria-label={`Choice ${ci + 1} is correct`} checked={q.answer === ci} onChange={() => upd({ ...q, answer: ci })} />
                  <input aria-label={`Choice ${ci + 1}`} className="input !min-h-[38px] font-mono text-sm" value={c} onChange={(e) => upd({ ...q, choices: q.choices.map((x: string, j: number) => (j === ci ? e.target.value : x)) })} />
                  {q.choices.length > 2 && <button type="button" className="text-muted hover:text-bad" aria-label={`Remove choice ${ci + 1}`} onClick={() => upd({ ...q, choices: q.choices.filter((_: string, j: number) => j !== ci), answer: q.answer >= ci && q.answer > 0 ? q.answer - 1 : q.answer })}><Trash2 className="h-4 w-4" aria-hidden /></button>}
                </div>
              ))}
              {q.choices.length < 6 && <button type="button" className="text-xs font-semibold text-brand" onClick={() => upd({ ...q, choices: [...q.choices, ""] })}>+ Add choice</button>}
            </fieldset>
            <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
              <input aria-label="Concept" className="input !min-h-[38px] text-sm" placeholder="concept (e.g. loops)" value={q.concept} onChange={(e) => upd({ ...q, concept: e.target.value })} />
              <input aria-label="Explanation" className="input !min-h-[38px] text-sm" placeholder="Why is that the answer? (shown after checking)" value={q.explanation} onChange={(e) => upd({ ...q, explanation: e.target.value })} />
            </div>
          </div>
        )}
      />
    </div>
  );
}

function ListEditor<T>({ items, onChange, blank, label, render }: { items: T[]; onChange: (v: T[]) => void; blank: T; label: string; render: (item: T, update: (v: T) => void, index: number) => React.ReactNode }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-xl border border-line p-3">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted">
            <span className="capitalize">{label} {i + 1}</span>
            {items.length > 1 && <button type="button" className="hover:text-bad" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Remove ${label} ${i + 1}`}><Trash2 className="h-4 w-4" aria-hidden /></button>}
          </div>
          {render(item, (v) => onChange(items.map((x, j) => (j === i ? v : x))), i)}
        </div>
      ))}
      <button type="button" className="btn-ghost !min-h-[36px] text-xs" onClick={() => onChange([...items, structuredClone(blank)])}><Plus className="h-3.5 w-3.5" aria-hidden /> Add {label}</button>
    </div>
  );
}
