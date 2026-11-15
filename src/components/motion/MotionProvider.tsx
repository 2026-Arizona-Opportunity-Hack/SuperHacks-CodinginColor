"use client";
import { MotionConfig } from "framer-motion";
import { createContext, useContext, useEffect, useState } from "react";

/**
 * One switch for all motion. "Calm" is on when the OS asks for reduced motion OR the user picks
 * Reduce motion / Lite mode in our reading-mode menu. Framer Motion only listens to the OS setting,
 * so we feed it through MotionConfig, and our own effects read useCalm().
 */
const CalmContext = createContext(false);
export const useCalm = () => useContext(CalmContext);

function readCalm() {
  const d = document.documentElement;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches || d.dataset.motion === "reduce" || d.dataset.lite === "on";
}

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [calm, setCalm] = useState(false);
  useEffect(() => {
    const update = () => setCalm(readCalm());
    update();
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", update);
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion", "data-lite"] });
    return () => {
      mq.removeEventListener("change", update);
      obs.disconnect();
    };
  }, []);
  return (
    <CalmContext.Provider value={calm}>
      <MotionConfig reducedMotion={calm ? "always" : "never"}>{children}</MotionConfig>
    </CalmContext.Provider>
  );
}
