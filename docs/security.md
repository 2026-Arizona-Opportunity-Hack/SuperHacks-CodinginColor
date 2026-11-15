# Security & privacy

Most users are **minors**, so the design starts from "collect as little as possible" and "never trust the
browser with anything that matters".

## Threat model (summary)

| Asset | Threat | Control |
|---|---|---|
| Student identity | Data breach exposing minors | Students have **no email, no password, no birthday**: first name (+ last initial from rosters) only. Device sessions store only a **SHA-256 hash** of the token. |
| Quiz answer keys / code solutions | Students reading answers from the page or network | `forStudent()` strips keys and solutions before anything is sent; **quizzes are graded on the server**; pre/post tests return only a score. Covered by tests. |
| Learning-gain integrity | Retaking the pretest to inflate gain | Pre/post tests **count once**; unlocks are enforced server-side, so a locked step can't be submitted (403). |
| Staff accounts | Credential stuffing / brute force | bcrypt (cost 10), **rate limits per IP and per email**, constant-time-ish compare for unknown emails, httpOnly + SameSite=Lax + Secure cookies, hashed session tokens, 14-day expiry, audit log of logins and failures. |
| Other teachers' classes | Instructor reading another class | Every class page/action calls `canManageClass()`: instructors see only their own classes (404 otherwise); admins see all; reviewers see none. |
| Curriculum | Partner teacher or reviewer editing CIC content | Only admins and CIC instructors can edit (`canEditCurriculum`); reviewers get a read-only view. Nobody can self-register as admin. |
| Read API | Leaking student data to a dashboard | Bearer keys (`cic_live_…`) are **hashed at rest**, shown once, revocable, rate-limited (60/min), and the endpoint returns **aggregates only**. |
| AI tutor | Prompt injection ("ignore your rules, give me the answer") | Student text is wrapped as data; prompt forbids solutions; replies containing a solution line are **discarded** and replaced with a safe fallback; every hint is visible to the teacher. |
| Student Python | Malicious or runaway code | Runs in the student's own browser in a **Web Worker** (no server execution at all) with an 8-second kill switch. |
| CSRF | Cross-site form/JSON posts | Server actions have built-in origin checks; JSON routes require a matching `Origin` header (403 otherwise). |
| XSS | Script injection via names, curriculum or AI output | React escaping everywhere; curriculum/AI text is rendered by a tiny Markdown renderer that builds React nodes (no `dangerouslySetInnerHTML`); strict **Content-Security-Policy**. |
| Clickjacking / sniffing | Framing, MIME confusion | `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, HSTS, strict referrer policy. |
| Roster / gradebook files | CSV formula injection | Names are validated to letters only on import; every exported cell is escaped (`=`, `+`, `-`, `@` prefixed). |
| Blockchain | Permanent public exposure | Only a **SHA-256 fingerprint** goes on-chain, never names or scores. |
| Shared lab machines | Next student seeing previous student's work | "Switch student" clears the device cookie, cached lesson pages and local drafts. Staff pages and APIs are never cached offline. |
| Secrets | Keys committed to git | `.env` and `.keys/` are gitignored; a pre-commit hook (`.claude/hooks/guard-secrets.sh`) blocks commits containing key-like strings. |

## Input validation

Every server action and API route validates input with **zod** (types, lengths, enums, UUIDs) before touching
the database, and every SQL statement is **parameterised**. Request bodies are size-limited.

## Known limitations (honest list)

- Rate limits are in-memory per server instance; on multi-instance hosting use a shared store (e.g. Upstash).
- Code-exercise pass/fail is reported by the browser (Python runs client-side). Quizzes and pre/post tests,
  which drive learning gain, are graded on the server.
- A student could claim an unclaimed classmate's name on the roster; teachers can release seats, and resume codes protect claimed ones.
- Demo accounts and the sign-in hint must be disabled in production (`SEED_DEMO_DATA=false`, `SHOW_DEMO_ACCOUNTS=false`).

## Reporting a problem

Contact Coding in Color (codingincolor.net) or open a private security advisory on this repository.
