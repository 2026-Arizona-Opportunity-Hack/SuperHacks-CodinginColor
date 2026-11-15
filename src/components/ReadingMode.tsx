"use client";
import { useEffect, useRef, useState } from "react";
import { Accessibility, Moon, Sun } from "lucide-react";
import { useT } from "@/i18n/client";

type Prefs = { theme?: string; contrast?: string; font?: string; motion?: string; lite?: string };
const KEY = "cic_prefs";

function load(): Prefs {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}
function apply(p: Prefs) {
  const d = document.documentElement;
  for (const k of ["theme", "contrast", "font", "motion", "lite"] as const) {
    if (p[k]) d.setAttribute(`data-${k}`, p[k]!);
    else d.removeAttribute(`data-${k}`);
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}

/** Reading-mode menu: dyslexia font, high contrast, reduced motion, lite mode, light/dark. */
export function ReadingMode() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [p, setP] = useState<Prefs>({});
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => setP(load()), []);
  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", esc);
    };
  }, []);
  const update = (next: Prefs) => {
    setP(next);
    apply(next);
  };
  const toggle = (k: keyof Prefs, on: string) => update({ ...p, [k]: p[k] === on ? undefined : on });
  // The site is light (green-and-white) by default; dark is an explicit choice from this toggle.
  const dark = p.theme === "dark";

  const options: { k: keyof Prefs; on: string; label: string }[] = [
    { k: "font", on: "dyslexia", label: t("a11y.dyslexia") },
    { k: "contrast", on: "high", label: t("a11y.contrast") },
    { k: "motion", on: "reduce", label: t("a11y.motion") },
    { k: "lite", on: "on", label: t("a11y.lite") },
  ];
  return (
    <div className="flex items-center gap-1" ref={ref}>
      <button
        type="button"
        className="btn-ghost !min-h-[40px] !px-2.5"
        aria-label={dark ? "Light mode" : "Dark mode"}
        onClick={() => update({ ...p, theme: dark ? "light" : "dark" })}
      >
        {dark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
      </button>
      <div className="relative">
        <button
          type="button"
          className="btn-ghost !min-h-[40px] !px-2.5"
          aria-expanded={open}
          aria-haspopup="true"
          aria-label={t("nav.a11y")}
          onClick={() => setOpen((o) => !o)}
        >
          <Accessibility className="h-4 w-4" aria-hidden />
        </button>
        {open && (
          <div className="card absolute end-0 z-40 mt-2 w-64 p-2" role="group" aria-label={t("nav.a11y")}>
            {options.map((o) => (
              <label key={o.k} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-raised">
                {o.label}
                <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--brand))]" checked={p[o.k] === o.on} onChange={() => toggle(o.k, o.on)} />
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
