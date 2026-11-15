# Accessibility

Students use school Chromebooks, personal phones and shared lab machines, and some read in a second language.

## What's built in

- **Reading-mode menu** (♿ in the header): dyslexia-friendly font and spacing, high contrast, reduced motion, lite mode (no videos/animations), light/dark theme. Saved per device.
- Respects the system **prefers-reduced-motion** and **prefers-color-scheme** settings.
- **Keyboard:** skip-to-content link, visible focus rings, no keyboard traps, Escape closes menus.
- **Screen readers:** landmarks (`header`, `nav`, `main`), labelled form fields, `aria-live` regions for results, hints and toasts, progress bars with values, status conveyed by text and not colour alone.
- **Charts** have a legend, value labels and a **table view**; colours are validated for colour-blind separation.
- **Touch targets** are at least 44 px.
- **Languages:** English, Spanish, Arabic (full right-to-left layout). AI hints answer in the student's language. The `lang` and `dir` attributes are set on every page.
- **Voice:** students can ask for a hint out loud and have hints read aloud (browser speech, nothing leaves the device).
- **Low bandwidth:** offline support for Python and visited lessons; lite mode.

## How to test

- Tab through `/join` → a module → the code editor: everything is reachable and focus is visible.
- Turn on VoiceOver (macOS: ⌘F5) on a module page: steps announce as completed or locked.
- Switch to العربية: layout mirrors; code stays left-to-right.
- Lighthouse accessibility audit on `/`, `/join` and `/learn`.
