/** @type {import('next').NextConfig} */

// Content-Security-Policy: scripts only from us and the Pyodide CDN (Python runs in the browser),
// videos only from YouTube/Vimeo, no plugins, no framing of this site by others.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net" + (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
  "worker-src 'self' blob:",
  "connect-src 'self' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://i.ytimg.com",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  "frame-src https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

export default {
  outputFileTracingRoot: import.meta.dirname,
  poweredByHeader: false,
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  outputFileTracingIncludes: { "/**": ["./db/schema.sql"] },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
