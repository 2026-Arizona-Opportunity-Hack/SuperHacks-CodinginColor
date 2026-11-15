"use client";
import { TeamLanyardRail, type LanyardMember } from "@/components/ui/team-lanyard-rail";
import { useT } from "@/i18n/client";

/** Initials avatar as an inline SVG data URI: no photos to host, nothing fetched from elsewhere. */
function avatar(initials: string, from: string, to: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)"/><text x="60" y="60" dy=".35em" text-anchor="middle" font-family="system-ui,sans-serif" font-size="46" font-weight="800" fill="#fff">${initials}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const MEMBERS: LanyardMember[] = [
  {
    id: "onkar",
    name: "Onkar",
    role: "AI Fullstack Engineer",
    team: "SuperHacks",
    image: avatar("O", "#2E6B12", "#6EA842"),
    bio: "Built CIC Learn end to end: the student journey, the Socratic AI tutor, teacher and admin dashboards, and security.",
    tags: ["AI", "Full stack", "Python"],
    links: [{ label: "GitHub", href: "https://github.com/onkarf1" }],
    tone: 1,
  },
  {
    id: "puneet",
    name: "Puneet Kumar",
    role: "Backend Engineer",
    team: "SuperHacks",
    image: avatar("PK", "#3F7F19", "#8CC665"),
    bio: "Backend engineer on the SuperHacks team.",
    tags: ["Backend", "Postgres"],
    links: [{ label: "GitHub", href: "https://github.com/Pun33t-B0kk4" }],
    tone: 3,
  },
  {
    id: "karthik",
    name: "Karthik",
    role: "Frontend Engineer",
    team: "SuperHacks",
    image: avatar("K", "#4E8A2C", "#9BD46A"),
    bio: "Frontend engineer on the SuperHacks team.",
    tags: ["Frontend", "UI"],
    tone: 4,
  },
  {
    id: "cic",
    name: "Coding in Color",
    role: "Nonprofit partner",
    team: "Phoenix, Arizona",
    image: "/brand/cic-logo-badge.png",
    bio: "Brings computer science and AI education to Arizona high schoolers whose schools don't offer it.",
    tags: ["501(c)(3)", "K12 CS", "AI Academy"],
    links: [{ label: "codingincolor.net", href: "https://codingincolor.net" }],
    tone: 2,
  },
];

export function TeamSection() {
  const t = useT();
  return (
    <TeamLanyardRail
      items={MEMBERS}
      eyebrow={t("landing.teamEyebrow")}
      heading={t("landing.teamHeading")}
      caption={t("landing.teamCaption")}
      autoplay
      labels={{ flip: t("team.flip"), back: t("team.back"), show: t("team.show") }}
    />
  );
}
