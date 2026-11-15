"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileImage, Loader2, Plus, Wand2 } from "lucide-react";
import { convertToModule, createBlankModule } from "@/app/actions/curriculum";

export function NewModule() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [concept, setConcept] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="card space-y-3 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await createBlankModule(title, concept);
          if (r.ok) router.push(`/curriculum/${r.id}`);
          else setError(r.error);
        });
      }}
    >
      <h2 className="font-bold">New module from template</h2>
      <p className="text-xs text-muted">Creates the CIC module template (pretest → video → slides → check → worksheet → code → exit → posttest) as a draft.</p>
      <label className="sr-only" htmlFor="nm-title">Title</label>
      <input id="nm-title" className="input" placeholder="Lists & dictionaries" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} />
      <label className="sr-only" htmlFor="nm-concept">Main concept</label>
      <input id="nm-concept" className="input" placeholder="Main concept (e.g. lists)" maxLength={40} value={concept} onChange={(e) => setConcept(e.target.value)} />
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      <button className="btn-primary w-full" disabled={pending || title.trim().length < 2}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />} Create draft
      </button>
    </form>
  );
}

/** Worksheet → module: paste text or upload a photo of a printed worksheet / slide. */
export function Converter({ aiReady }: { aiReady: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="card space-y-3 border-accent/40 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        start(async () => {
          const r = await convertToModule({ text, image: image ?? undefined });
          if (r.ok) router.push(`/curriculum/${r.id}?converted=1`);
          else setError(r.error);
        });
      }}
    >
      <h2 className="flex items-center gap-2 font-bold"><Wand2 className="h-4 w-4 text-accent" aria-hidden /> Worksheet → module (AI)</h2>
      <p className="text-xs text-muted">Paste a worksheet or slide text, or upload a photo. AI drafts the whole module (summary, slides, check, worksheet, auto-graded code exercise, exit and pre/post tests). You review and publish.</p>
      <label className="sr-only" htmlFor="conv-text">Worksheet text</label>
      <textarea id="conv-text" className="input min-h-[110px] text-sm" maxLength={20000} placeholder="Paste the printed worksheet or slide deck text here…" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="flex flex-wrap items-center gap-2">
        <label className="btn-ghost cursor-pointer">
          <FileImage className="h-4 w-4" aria-hidden /> {image ? "Photo attached ✓" : "Upload a photo"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 4_000_000) return setError("Photo is too large (max 4 MB).");
              const reader = new FileReader();
              reader.onload = () => setImage(String(reader.result));
              reader.readAsDataURL(f);
            }}
          />
        </label>
        <button className="btn-accent flex-1" disabled={pending || !aiReady || (!text.trim() && !image)}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Wand2 className="h-4 w-4" aria-hidden />} {pending ? "Drafting the module (~30s)…" : "Convert to module"}
        </button>
      </div>
      {!aiReady && <p className="text-xs text-warn">Add OPENAI_API_KEY to .env to enable this.</p>}
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
    </form>
  );
}
