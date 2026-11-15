import type { Config } from "tailwindcss";

// Colors come from CSS variables in globals.css so CIC can re-brand in one place
// and high-contrast / dark mode just swap the variables.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: v("bg"),
        surface: v("surface"),
        raised: v("raised"),
        ink: v("ink"),
        muted: v("muted"),
        line: v("line"),
        brand: v("brand"),
        "brand-ink": v("brand-ink"),
        accent: v("accent"),
        good: v("good"),
        warn: v("warn"),
        bad: v("bad"),
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: { xl: "14px", "2xl": "20px", "3xl": "28px" },
      boxShadow: { card: "0 1px 2px rgb(0 0 0 / .04), 0 8px 24px -12px rgb(0 0 0 / .18)" },
    },
  },
  plugins: [],
} satisfies Config;
