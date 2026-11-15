export const LOCALES = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "es", label: "Español", dir: "ltr" },
  { code: "ar", label: "العربية", dir: "rtl" },
  { code: "fr", label: "Français", dir: "ltr" },
  { code: "pt", label: "Português", dir: "ltr" },
  { code: "hi", label: "हिन्दी", dir: "ltr" },
  { code: "zh", label: "中文", dir: "ltr" },
  { code: "vi", label: "Tiếng Việt", dir: "ltr" },
] as const;
export type Locale = (typeof LOCALES)[number]["code"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "cic_lang";
export const isLocale = (v: unknown): v is Locale => LOCALES.some((l) => l.code === v);
export const dirOf = (l: Locale) => LOCALES.find((x) => x.code === l)!.dir;
/** Name of the language, used to tell the AI tutor which language to answer in. */
export const languageName = (l: Locale) =>
  ({ en: "English", es: "Spanish", ar: "Arabic", fr: "French", pt: "Portuguese", hi: "Hindi", zh: "Simplified Chinese", vi: "Vietnamese" })[l];
