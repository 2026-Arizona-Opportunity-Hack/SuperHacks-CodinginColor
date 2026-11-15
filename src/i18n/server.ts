import "server-only";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { dictionaries, translate, type Key } from "./messages";

export async function getLocale(): Promise<Locale> {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(c)) return c;
  // First visit: honour the browser's language if we support it.
  const accept = (await headers()).get("accept-language") ?? "";
  const match = accept
    .split(",")
    .map((p) => p.split(";")[0].trim().slice(0, 2))
    .find(isLocale);
  return match ?? DEFAULT_LOCALE;
}

export async function getT() {
  const locale = await getLocale();
  return Object.assign((key: Key, vars?: Record<string, string | number>) => translate(locale, key, vars), { locale, dict: dictionaries[locale] });
}
