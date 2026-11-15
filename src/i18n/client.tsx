"use client";
import { createContext, useContext } from "react";
import type { Locale } from "./config";
import { translate, type Key } from "./messages";

const Ctx = createContext<Locale>("en");
export const I18nProvider = ({ locale, children }: { locale: Locale; children: React.ReactNode }) => (
  <Ctx.Provider value={locale}>{children}</Ctx.Provider>
);
export function useT() {
  const locale = useContext(Ctx);
  return Object.assign((key: Key, vars?: Record<string, string | number>) => translate(locale, key, vars), { locale });
}
