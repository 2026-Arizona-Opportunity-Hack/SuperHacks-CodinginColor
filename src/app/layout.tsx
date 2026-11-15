import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { getLocale, getT } from "@/i18n/server";
import { dirOf } from "@/i18n/config";
import { I18nProvider } from "@/i18n/client";
import { Header } from "@/components/Header";
import { OfflineSupport } from "@/components/OfflineSupport";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "CIC Learn", template: "%s · CIC Learn" },
  description: "Coding in Color's curriculum and student progress platform: one link, every student unstuck.",
  icons: { icon: "/icon.svg" },
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = { themeColor: "#6d28d9", width: "device-width", initialScale: 1 };

// Applies saved reading-mode preferences before first paint (no flash). Values are whitelisted.
const prefsScript = `try{var p=JSON.parse(localStorage.getItem('cic_prefs')||'{}'),d=document.documentElement;
['theme','contrast','font','motion','lite'].forEach(function(k){var v=p[k];if(typeof v==='string'&&/^[a-z]{2,10}$/.test(v))d.setAttribute('data-'+k,v)})}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = await getT();
  return (
    <html lang={locale} dir={dirOf(locale)} className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: prefsScript }} />
      </head>
      <body className="min-h-screen font-sans">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-brand-ink">
          {t("nav.skip")}
        </a>
        <I18nProvider locale={locale}>
          <Header />
          <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6">
            {children}
          </main>
          <OfflineSupport />
        </I18nProvider>
      </body>
    </html>
  );
}
