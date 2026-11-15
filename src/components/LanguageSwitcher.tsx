"use client";
import { useTransition } from "react";
import { Languages } from "lucide-react";
import { LOCALES } from "@/i18n/config";
import { useT } from "@/i18n/client";
import { setLanguage } from "@/app/actions/prefs";

export function LanguageSwitcher() {
  const t = useT();
  const [pending, start] = useTransition();
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{t("nav.language")}</span>
      <Languages className="pointer-events-none absolute start-2.5 h-4 w-4 text-muted" aria-hidden />
      <select
        className="min-h-[40px] appearance-none rounded-xl border border-line bg-surface py-1.5 pe-3 ps-8 text-sm font-medium"
        value={t.locale}
        disabled={pending}
        onChange={(e) => {
          const v = e.target.value;
          start(() => setLanguage(v));
        }}
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
