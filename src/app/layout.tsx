import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { headers } from "next/headers";
import { getLocale, getT } from "@/i18n/server";
import { dirOf } from "@/i18n/config";
import { I18nProvider } from "@/i18n/client";
import { Header } from "@/components/Header";
import { OfflineSupport } from "@/components/OfflineSupport";
import { OfflineSync } from "@/components/OfflineSync";
import { HelperChat } from "@/components/HelperChat";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { ScrollProgress } from "@/components/motion/Effects";

// Hindi and Chinese fall back to the device's system fonts (Noto / PingFang), which cover those scripts well.
const sans = Plus_Jakarta_Sans({ subsets: ["latin", "latin-ext", "vietnamese"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "CIC Learn", template: "%s · CIC Learn" },
  description: "Coding in Color's curriculum and student progress platform: one link, every student unstuck.",
  icons: { icon: [{ url: "/brand/cic-logo-256.png", type: "image/png" }], apple: "/brand/cic-logo-512.png" },
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = { themeColor: "#BAED91", width: "device-width", initialScale: 1 };

// Applies saved reading-mode preferences before first paint (no flash). Values are whitelisted.
const prefsScript = `try{var p=JSON.parse(localStorage.getItem('cic_prefs')||'{}'),d=document.documentElement;
['theme','contrast','font','motion','lite'].forEach(function(k){var v=p[k];if(typeof v==='string'&&/^[a-z]{2,10}$/.test(v))d.setAttribute('data-'+k,v)})}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = await getT();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang={locale} dir={dirOf(locale)} className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: prefsScript }} />
      </head>
      <body className="min-h-screen font-sans">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-brand-ink">
          {t("nav.skip")}
        </a>
        <MotionProvider>
        <ScrollProgress />
        <I18nProvider locale={locale}>
          <Header />
          <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6">
            {children}
          </main>
          <OfflineSupport />
          <OfflineSync />
          <HelperChat />
        </I18nProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
