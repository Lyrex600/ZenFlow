/**
 * Content-Security-Policy for the published app. 'unsafe-inline' scripts are
 * required by the framework's inline hydration payload; eval stays forbidden
 * and resources come from our own origin, plus the account backend for API calls.
 */
const BASE_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];

/** Meta-tag CSP (frame-ancestors is ignored in meta, so it lives in the header only). */
export const CSP_META = BASE_DIRECTIVES.join("; ");
export const CSP_HEADER = [...BASE_DIRECTIVES, "frame-ancestors 'none'", "upgrade-insecure-requests"].join("; ");

export const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": CSP_HEADER,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
};
