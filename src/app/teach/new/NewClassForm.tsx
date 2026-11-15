"use client";
import { useState, useTransition } from "react";
import { FileUp, Loader2, Timer } from "lucide-react";
import { createClass, parseRoster, type RosterRow } from "@/app/actions/teach";

type Mod = { id: string; position: number; title: string; summary: string };

/** One screen, three steps: name it, add students, pick modules. Designed to finish in under 10 minutes (usually ~2). */
export function NewClassForm({ modules, organization }: { modules: Mod[]; organization: string }) {
  const [name, setName] = useState("");
  const [school, setSchool] = useState(organization === "Coding in Color" ? "" : organization);
  const [roster, setRoster] = useState("");
  const [preview, setPreview] = useState<{ rows: RosterRow[]; skipped: number } | null>(null);
  const [selected, setSelected] = useState<string[]>(modules.slice(0, 1).map((m) => m.id));
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const updateRoster = (text: string) => {
    setRoster(text);
    if (!text.trim()) return setPreview(null);
    parseRoster(text).then(setPreview);
  };

  return (
    <form
      className="mx-auto max-w-3xl space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        start(async () => {
          try {
            await createClass({ name, school, cohort: "", modules: selected, roster });
          } catch (err) {
            if ((err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw err;
            setError("Could not create the class. Check the fields and try again.");
          }
        });
      }}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="h-display text-3xl">New class</h1>
        <p className="flex items-center gap-1 text-sm text-muted">
          <Timer className="h-4 w-4" aria-hidden /> Takes about 2 minutes
        </p>
      </div>

      <section className="card space-y-4 p-6" aria-labelledby="s1">
        <h2 id="s1" className="font-display text-lg font-bold">
          1 · Name your class
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">Class name</label>
            <input id="name" className="input" required minLength={2} maxLength={80} placeholder="AI Academy · Period 2" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="school">School</label>
            <input id="school" className="input" maxLength={120} placeholder="Maryvale High School" value={school} onChange={(e) => setSchool(e.target.value)} />
          </div>
        </div>
      </section>

      <section className="card space-y-3 p-6" aria-labelledby="s2">
        <h2 id="s2" className="font-display text-lg font-bold">
          2 · Add students <span className="text-sm font-normal text-muted">(optional: students can also add themselves)</span>
        </h2>
        <p className="text-sm text-muted">Upload the roster CSV from Google Classroom or your SIS, or paste one name per line. Only first names and last initials are kept.</p>
        <label className="btn-ghost w-fit cursor-pointer">
          <FileUp className="h-4 w-4" aria-hidden /> Upload CSV
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f && f.size < 200_000) updateRoster(await f.text());
            }}
          />
        </label>
        <label className="sr-only" htmlFor="roster">Roster</label>
        <textarea id="roster" className="input min-h-[120px] font-mono text-sm" placeholder={"first_name,last_name,student_id\nAna,Lopez,1001\nMateo,Diaz,1002"} value={roster} onChange={(e) => updateRoster(e.target.value)} />
        {preview && (
          <p className="text-sm" aria-live="polite">
            <b>{preview.rows.length}</b> students found{preview.skipped ? `, ${preview.skipped} rows skipped` : ""}:{" "}
            <span className="text-muted">{preview.rows.slice(0, 8).map((r) => r.name).join(", ")}{preview.rows.length > 8 ? "…" : ""}</span>
          </p>
        )}
      </section>

      <section className="card space-y-3 p-6" aria-labelledby="s3">
        <h2 id="s3" className="font-display text-lg font-bold">
          3 · Assign modules
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {modules.map((m) => (
            <li key={m.id}>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 has-[:checked]:border-brand has-[:checked]:bg-brand/5">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={selected.includes(m.id)}
                  onChange={(e) => setSelected((s) => (e.target.checked ? [...s, m.id] : s.filter((x) => x !== m.id)))}
                />
                <span>
                  <span className="font-semibold">
                    {m.position}. {m.title}
                  </span>
                  <span className="block text-xs text-muted">{m.summary}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      {error && <p role="alert" className="text-sm font-medium text-bad">{error}</p>}
      <button className="btn-primary !min-h-[52px] w-full text-base" disabled={pending || name.trim().length < 2}>
        {pending && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />} Create class and get the join code
      </button>
    </form>
  );
}
