import { NextResponse, type NextRequest } from "next/server";

// Embeds we allow, and nothing else.
const FRAME_SRC = [
  "https://challenges.cloudflare.com",
  "https://www.youtube-nocookie.com",
  "https://player.vimeo.com",
  "https://open.spotify.com",
  "https://w.soundcloud.com",
];

function csp(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self' https://challenges.cloudflare.com",
    `frame-src ${FRAME_SRC.join(" ")}`,
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=(), screen-wake-lock=(self), fullscreen=(self)",
  "Cross-Origin-Opener-Policy": "same-origin",
};

export function middleware(request: NextRequest) {
  // Cross-site request forgery: anything that changes data must come from
  // our own pages. Browsers always send Origin on POST; Sec-Fetch-Site backs it up.
  if (request.method !== "GET" && request.method !== "HEAD") {
    const origin = request.headers.get("origin");
    const site = request.headers.get("sec-fetch-site");
    const ok = origin ? origin === request.nextUrl.origin : site === "same-origin";
    if (!ok || (site && site !== "same-origin")) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const nonce = btoa(crypto.randomUUID());
  const policy = csp(nonce);
  const reqHeaders = new Headers(request.headers);
  reqHeaders.set("content-security-policy", policy);
  const res = NextResponse.next({ request: { headers: reqHeaders } });
  res.headers.set("Content-Security-Policy", policy);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
  // Pages carry a per-request nonce and may show signed-in content: never cache them.
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|fonts/|favicon|icon|robots.txt).*)"],
};
