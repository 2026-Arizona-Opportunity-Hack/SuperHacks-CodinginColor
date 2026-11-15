"use client";
import { useEffect, useRef, useState } from "react";
import { Users } from "lucide-react";
import { useT } from "@/i18n/client";

/** Live pair programming: share a 5-letter code; both editors stay in sync. */
export function PairPanel({ activityId, code, onRemoteCode }: { activityId: string; code: string; onRemoteCode: (c: string) => void }) {
  const t = useT();
  const [room, setRoom] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [partner, setPartner] = useState<string | null>(null);
  const [error, setError] = useState("");
  const version = useRef(0);
  const lastSent = useRef(code);
  const latest = useRef(code);
  latest.current = code;

  const call = async (body: object) => {
    const r = await fetch("/api/pair", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { ok: r.ok, data: await r.json() };
  };

  useEffect(() => {
    if (!room) return;
    const id = setInterval(async () => {
      const mine = latest.current !== lastSent.current ? latest.current : undefined;
      const { ok, data } = await call({ op: "sync", code: room, version: version.current, content: mine });
      if (!ok) return;
      if (mine !== undefined) lastSent.current = mine;
      if (data.changed && data.content !== latest.current) {
        lastSent.current = data.content;
        onRemoteCode(data.content);
      }
      version.current = data.version;
      if (data.partner) setPartner(data.partner);
    }, 1500);
    return () => clearInterval(id);
  }, [room, onRemoteCode]);

  if (room)
    return (
      <div className="card p-4 text-sm" aria-live="polite">
        <p className="flex items-center gap-2 font-bold">
          <Users className="h-4 w-4 text-brand" aria-hidden /> {t("code.pair")}
        </p>
        <p className="mt-1 text-muted">{t("code.pairHelp")}</p>
        <p className="mt-2 font-mono text-2xl tracking-[0.3em]">{room}</p>
        {partner && <p className="mt-1 text-xs text-good">● {partner}</p>}
      </div>
    );

  return (
    <details className="card p-4 text-sm">
      <summary className="flex cursor-pointer items-center gap-2 font-bold">
        <Users className="h-4 w-4 text-brand" aria-hidden /> {t("code.pair")}
      </summary>
      <button
        className="btn-ghost mt-3 w-full"
        onClick={async () => {
          const { ok, data } = await call({ op: "create", activityId, content: code });
          if (ok) {
            version.current = data.version;
            lastSent.current = code;
            setRoom(data.code);
          } else setError(data.error);
        }}
      >
        {t("code.pair")}
      </button>
      <form
        className="mt-2 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const { ok, data } = await call({ op: "join", code: joinCode });
          if (!ok) return setError(data.error);
          if (data.activityId !== activityId) return setError("That code is for a different activity.");
          version.current = data.version;
          lastSent.current = data.content;
          onRemoteCode(data.content);
          setRoom(data.code);
        }}
      >
        <label className="sr-only" htmlFor="pair-code">
          {t("code.pairJoin")}
        </label>
        <input id="pair-code" className="input !min-h-[40px] font-mono uppercase" maxLength={5} placeholder="ABCDE" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} />
        <button className="btn-ghost shrink-0" disabled={joinCode.length !== 5}>
          {t("code.pairJoin")}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-xs text-bad">
          {error}
        </p>
      )}
    </details>
  );
}
