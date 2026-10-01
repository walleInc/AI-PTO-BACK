export const SESSION_COOKIE_NAME = "ai_pto_session";

export const OIDC_STATE_TTL_SECONDS = 600;

export function getSessionTtlSeconds(): number {
  const raw = process.env.SESSION_TTL_SECONDS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 86_400;
}

export function isCookieSecure(): boolean {
  return process.env.COOKIE_SECURE === "true";
}

export function sessionCookieOptions(maxAgeSeconds?: number) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: isCookieSecure(),
    ...(maxAgeSeconds !== undefined ? { maxAge: maxAgeSeconds * 1000 } : {}),
  };
}

/** Origin SPA. После OIDC callback браузер уходит на `{origin}/dashboard`. */
export function postLoginRedirectUrl(): string {
  const origin = (process.env.FRONTEND_ORIGIN ?? "http://localhost:5173").replace(/\/$/, "");
  return `${origin}/dashboard`;
}
