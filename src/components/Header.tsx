import Link from "next/link";
import { LogOut } from "lucide-react";
import { currentStaff, currentStudent } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { signOut } from "@/app/actions/session";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ReadingMode } from "./ReadingMode";

export async function Header() {
  const [t, staff, student] = await Promise.all([getT(), currentStaff(), currentStudent()]);
  const links: { href: string; label: string }[] = [];
  if (student) links.push({ href: "/learn", label: t("nav.learn") });
  if (staff?.role === "instructor" || staff?.role === "admin") links.push({ href: "/teach", label: t("nav.teach") });
  if (staff?.role === "admin") links.push({ href: "/admin", label: t("nav.admin") });
  if (staff) links.push({ href: "/curriculum", label: t("nav.curriculum") });
  if (staff) links.push({ href: "/account", label: "Security" });
  links.push({ href: "/play", label: t("nav.playground") });

  return (
    <header className="no-print sticky top-0 z-30 border-b border-line/70 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-extrabold">
          <Logo />
          <span>
            CIC <span className="text-brand">Learn</span>
          </span>
        </Link>
        <nav aria-label="Main" className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-raised hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <LanguageSwitcher />
          <ReadingMode />
          {staff ? (
            <form action={signOut}>
              <button className="btn-ghost !min-h-[40px]" title={staff.email}>
                <LogOut className="h-4 w-4" aria-hidden />
                <span className="hidden md:inline">{t("nav.signout")}</span>
              </button>
            </form>
          ) : !student ? (
            <Link href="/login" className="btn-ghost !min-h-[40px] hidden sm:inline-flex">
              {t("nav.signin")}
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
