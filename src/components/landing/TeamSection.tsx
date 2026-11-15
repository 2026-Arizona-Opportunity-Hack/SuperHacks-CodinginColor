"use client";
import { TeamLanyardRail, type LanyardMember } from "@/components/ui/team-lanyard-rail";
import { useT } from "@/i18n/client";

// Team photos live in public/team/ (400×400 JPEG, metadata stripped); the badge crops them to a circle.
const MEMBERS: LanyardMember[] = [
  {
    id: "onkar",
    name: "Onkar",
    role: "AI Fullstack Engineer",
    team: "SuperHacks",
    image: "/team/onkar.jpg",
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
    image: "/team/puneet.jpg",
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
    image: "/team/karthik.jpg",
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
