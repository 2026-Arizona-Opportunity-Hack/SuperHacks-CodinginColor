# Monday handoff: what CIC can do now, and the plan to finish

## Usable on Monday

- Partner teachers create a class, import a roster and share a join code: no training on slide decks.
- Students work through the four Python Foundations modules self-paced, with auto-graded Python and hints.
- Instructors see who is stuck or hasn't started, and get a reteach plan for the hardest concept.
- Admins see completion and learning gain for every cohort, print a funder report, and give the org dashboard an API key.
- Staff edit the curriculum and turn paper worksheets into modules (AI-assisted).

## Before real students (1–2 days, $0)

1. Deploy with `SEED_DEMO_DATA=false` and `SHOW_DEMO_ACCOUNTS=false` ([docs/deploy.md](docs/deploy.md)); create CIC's admin account.
2. Add CIC's logo and brand colours (`src/components/Logo.tsx`, variables in `src/app/globals.css`).
3. Load the real curriculum: run CIC's existing worksheets through **Worksheet → module**, review, publish.
4. Add CIC's own video links to each module's video step.
5. Decide the AI provider (OHack gateway, donated OpenAI/Azure credits, or none) and set the key.

## Completion plan (the $1,600 completion work, ~4 weeks part-time)

| Week | Deliverable | Done when |
|---|---|---|
| 1 | Production deploy, CIC admin onboarding, real curriculum for 2 modules | CIC staff publish a module without help |
| 2 | Pilot with one AI Academy cohort; fix what teachers hit; tune "stuck" thresholds | A partner teacher runs a week of class from the link |
| 3 | Google Classroom roster sync; shared rate-limit store; nightly DB backup check | Roster import without CSV |
| 4 | Grant-report polish with CIC's program manager; handover session for next semester's ASU instructors | CIC signs off on the Definition of Done |

## Roadmap after that

- Google Classroom / SIS roster sync (P2 in the brief)
- More languages (the UI is dictionary-based: add `src/i18n/<lang>.ts`)
- Per-organisation curriculum forks for districts running their own versions
- Server-side code grading for credit-bearing classes (a sandboxed runner) if CIC needs tamper-proof code scores

## Who to ask

- Code: this repository's README, [architecture](docs/architecture.md) and tests (`npm test`).
- Product decisions: Coding in Color staff in `#npo-coding-in-color`.
