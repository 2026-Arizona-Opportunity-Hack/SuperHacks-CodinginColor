/** @type {import('next').NextConfig} */

// Content-Security-Policy is set per request (with a nonce) in src/middleware.ts.

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
];

export default {
  outputFileTracingRoot: import.meta.dirname,
  poweredByHeader: false,
  // Worksheet photos for the AI converter are sent to a server action as data URLs.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  outputFileTracingIncludes: { "/**": ["./db/schema.sql"] },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
