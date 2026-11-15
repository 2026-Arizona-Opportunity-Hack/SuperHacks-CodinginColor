import { NextResponse, type NextRequest } from "next/server";

/**
 * Content-Security-Policy with a fresh nonce per request: only scripts that carry the nonce
 * (Next.js's own, and our one inline script) can run, so injected <script> tags are inert.
 * 'strict-dynamic' lets those trusted scripts load their own chunks.
 */
export function middleware(req: NextRequest) {
  const dev = process.env.NODE_ENV === "development";

  // The Python worker runs no page markup; it only needs Pyodide from the CDN and WebAssembly.
  if (req.nextUrl.pathname === "/pyodide-worker.js") {
    const res = NextResponse.next();
    res.headers.set(
      "Content-Security-Policy",
      "default-src 'none'; script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net; connect-src 'self' https://cdn.jsdelivr.net"
    );
    return res;
  }

  const nonce = btoa(crypto.randomUUID());
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${dev ? " 'unsafe-eval'" : ""}`,
    "worker-src 'self' blob:",
    "connect-src 'self' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://i.ytimg.com",
    "font-src 'self' data:",
    "media-src 'self' blob:",
    "frame-src https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  // Next.js reads the nonce from the request's CSP header and stamps it on its own scripts.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  // Static assets don't need a per-request policy.
  matcher: [{ source: "/((?!_next/static|_next/image|icon.svg|manifest.webmanifest|sw.js).*)" }],
};
