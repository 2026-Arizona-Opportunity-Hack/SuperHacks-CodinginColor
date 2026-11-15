"use client";
import { useState, useTransition } from "react";
import { Copy, HeartHandshake, Loader2 } from "lucide-react";
import { useT } from "@/i18n/client";
import { createFamilyLink, revokeFamilyLinks } from "@/app/actions/family";

/** Consent-gated family view: nothing is shared until the student creates a link, and they can turn it off. */
export function FamilyCard({ active }: { active: boolean }) {
  const t = useT();
  const [url, setUrl] = useState("");
  const [on, setOn] = useState(active);
  const [pending, start] = useTransition();
  return (
    <div className="card p-5">
      <h2 className="flex items-center gap-2 font-bold"><HeartHandshake className="h-4 w-4 text-brand" aria-hidden /> {t("family.cardTitle")}</h2>
      <p className="mt-1 text-xs text-muted">{t("family.cardHelp")}</p>
      {url ? (
        <div className="mt-3 flex items-center gap-2">
          <code className="flex-1 break-all rounded-lg bg-raised p-2 font-mono text-[11px]">{url}</code>
          <button className="btn-ghost !min-h-[36px] !px-2" aria-label={t("code.share")} onClick={() => navigator.clipboard?.writeText(url)}><Copy className="h-4 w-4" aria-hidden /></button>
        </div>
      ) : null}
      <div className="mt-3 flex gap-2">
        <button className="btn-ghost flex-1 text-sm" disabled={pending} onClick={() => start(async () => {
          const token = await createFamilyLink();
          if (token) { setUrl(`${location.origin}/family/${token}`); setOn(true); }
        })}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} {on ? t("family.newLink") : t("family.share")}
        </button>
        {on && <button className="btn-ghost text-sm text-bad" disabled={pending} onClick={() => start(async () => { await revokeFamilyLinks(); setOn(false); setUrl(""); })}>{t("family.stop")}</button>}
      </div>
    </div>
  );
}
