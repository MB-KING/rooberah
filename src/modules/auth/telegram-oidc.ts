import { NextRequest } from "next/server";
import crypto from "node:crypto";
import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey
} from "jose";
import { config } from "@/lib/config";
import {
  telegramUserSchema,
  type TelegramUser
} from "@/modules/auth/telegram";
import { SESSION_MAX_AGE_SECONDS } from "@/modules/auth/telegram-cookie";
import { AppError } from "@/shared/errors";

export const TELEGRAM_OIDC_ISSUER = "https://oauth.telegram.org";
export const TELEGRAM_OIDC_AUTH_URL = "https://oauth.telegram.org/auth";
export const TELEGRAM_OIDC_TOKEN_URL = "https://oauth.telegram.org/token";
export const TELEGRAM_OIDC_JWKS_URL =
  "https://oauth.telegram.org/.well-known/jwks.json";

export const TELEGRAM_OIDC_STATE_COOKIE = "hm_tg_oidc_state";
export const TELEGRAM_OIDC_VERIFIER_COOKIE = "hm_tg_oidc_verifier";
export const TELEGRAM_OIDC_NONCE_COOKIE = "hm_tg_oidc_nonce";
export const OIDC_SESSION_PREFIX = "oidc.v1.";

const jwks = createRemoteJWKSet(new URL(TELEGRAM_OIDC_JWKS_URL));

export function telegramOidcClientId() {
  const fromEnv = config.TELEGRAM_OIDC_CLIENT_ID?.trim();
  if (fromEnv) return fromEnv;
  const botId = config.TELEGRAM_BOT_TOKEN.split(":")[0];
  return botId || "";
}

export function telegramOidcClientSecret() {
  return config.TELEGRAM_OIDC_CLIENT_SECRET?.trim() || "";
}

export function requireTelegramOidcCredentials() {
  const clientId = telegramOidcClientId();
  const clientSecret = telegramOidcClientSecret();
  if (!clientId || !clientSecret) {
    throw new AppError(
      "UNAUTHORIZED",
      "Telegram OpenID Connect is not configured",
      401
    );
  }
  return { clientId, clientSecret };
}

export function createPkcePair() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function createOidcState() {
  return crypto.randomBytes(24).toString("base64url");
}

export function buildTelegramOidcAuthUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  challenge: string;
  nonce: string;
}) {
  const url = new URL(TELEGRAM_OIDC_AUTH_URL);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile telegram:bot_access");
  url.searchParams.set("state", input.state);
  url.searchParams.set("nonce", input.nonce);
  url.searchParams.set("code_challenge", input.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export function isPrivateAppHost(value: string) {
  const host = value
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    ?.split(":")[0]
    ?.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
}

function publicHttpsOrigin(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (isPrivateAppHost(url.hostname)) return "";
    return `https://${url.host}`;
  } catch {
    return "";
  }
}

export function resolvePublicAppOrigin(input: {
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  envUrl?: string | null;
  requestOrigin: string;
}) {
  // Telegram BotFather only allows exact HTTPS callback URLs. TLS-terminating
  // proxies (HAProxy) often forward to Node over HTTP and set
  // X-Forwarded-Proto: http, which must never produce http://public-host.
  const fromEnv = publicHttpsOrigin(input.envUrl || "");
  if (fromEnv) return fromEnv;

  const forwardedHost = input.forwardedHost?.split(",")[0]?.trim() || "";
  const fromForwarded = publicHttpsOrigin(forwardedHost);
  if (fromForwarded) return fromForwarded;

  const fromRequest = publicHttpsOrigin(input.requestOrigin);
  if (fromRequest) return fromRequest;

  return input.requestOrigin.replace(/\/$/, "");
}

export function telegramOidcAppOrigin(request: NextRequest) {
  return resolvePublicAppOrigin({
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    envUrl: process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL,
    requestOrigin: request.nextUrl.origin
  });
}

export function telegramOidcAbsoluteUrl(path: string, origin: string) {
  return new URL(path, `${origin.replace(/\/$/, "")}/`);
}

export function telegramOidcRedirectUri(origin: string) {
  return `${origin.replace(/\/$/, "")}/api/auth/telegram-oidc/callback`;
}

export function telegramOidcFlowCookieOptions() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600
  };
}

export function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function assertOidcCookie(actual: string | undefined, expected: string | undefined) {
  if (!actual || !expected || !safeEqual(actual, expected)) {
    throw new AppError("UNAUTHORIZED", "Invalid Telegram OpenID state", 401);
  }
}

export async function exchangeTelegramOidcCode(input: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
}) {
  const basic = Buffer.from(
    `${input.clientId}:${input.clientSecret}`,
    "utf8"
  ).toString("base64");

  const response = await fetch(TELEGRAM_OIDC_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: input.redirectUri,
      client_id: input.clientId,
      code_verifier: input.codeVerifier
    })
  });

  const payload = (await response.json().catch(() => null)) as {
    id_token?: string;
    error?: string;
  } | null;

  if (!response.ok || !payload?.id_token) {
    throw new AppError("UNAUTHORIZED", "Telegram token exchange failed", 401);
  }

  return payload.id_token;
}

function telegramIdFromOidcClaims(payload: JWTPayload) {
  const idRaw = payload.id;
  const id = typeof idRaw === "number" ? idRaw : Number(idRaw);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new AppError("UNAUTHORIZED", "Missing Telegram user id in id_token", 401);
  }
  return id;
}

export function mapOidcClaimsToTelegramUser(payload: JWTPayload): TelegramUser {
  const id = telegramIdFromOidcClaims(payload);

  const name =
    typeof payload.name === "string" ? payload.name.trim() : "";
  const given =
    typeof payload.given_name === "string" ? payload.given_name.trim() : "";
  const family =
    typeof payload.family_name === "string" ? payload.family_name.trim() : "";
  const parts = name.split(/\s+/).filter(Boolean);
  const firstName = given || parts[0] || undefined;
  const lastName =
    family ||
    (given
      ? name.slice(given.length).trim() || undefined
      : parts.slice(1).join(" ") || undefined);

  return telegramUserSchema.parse({
    id,
    first_name: firstName,
    last_name: lastName,
    username:
      typeof payload.preferred_username === "string"
        ? payload.preferred_username
        : undefined,
    photo_url: typeof payload.picture === "string" ? payload.picture : undefined
  });
}

export async function verifyTelegramOidcIdToken(
  idToken: string,
  clientId: string,
  nonce?: string,
  keySet: JWTVerifyGetKey = jwks
) {
  const { payload } = await jwtVerify(idToken, keySet, {
    issuer: TELEGRAM_OIDC_ISSUER,
    audience: clientId,
    clockTolerance: 30
  });
  if (typeof payload.nonce === "string" && nonce && payload.nonce !== nonce) {
    throw new AppError("UNAUTHORIZED", "Invalid Telegram OpenID nonce", 401);
  }
  return mapOidcClaimsToTelegramUser(payload);
}

export async function loginUserFromTelegramOidcCode(input: {
  code: string;
  state: string;
  expectedState: string | undefined;
  redirectUri: string;
  codeVerifier: string | undefined;
  nonce: string | undefined;
}) {
  assertOidcCookie(input.state, input.expectedState);
  if (!input.codeVerifier) {
    throw new AppError("UNAUTHORIZED", "Missing Telegram OpenID verifier", 401);
  }

  const { clientId, clientSecret } = requireTelegramOidcCredentials();
  const idToken = await exchangeTelegramOidcCode({
    code: input.code,
    redirectUri: input.redirectUri,
    codeVerifier: input.codeVerifier,
    clientId,
    clientSecret
  });
  return verifyTelegramOidcIdToken(idToken, clientId, input.nonce);
}

function sessionSecret() {
  return (
    telegramOidcClientSecret() ||
    config.TELEGRAM_BOT_TOKEN
  );
}

export function isTelegramOidcSessionPayload(raw: string) {
  return raw.startsWith(OIDC_SESSION_PREFIX);
}

export function serializeTelegramOidcSession(
  user: TelegramUser,
  secret = sessionSecret()
) {
  const body = Buffer.from(
    JSON.stringify({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      photo_url: user.photo_url,
      exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS
    }),
    "utf8"
  ).toString("base64url");
  const sig = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64url");
  return `${OIDC_SESSION_PREFIX}${body}.${sig}`;
}

export function validateTelegramOidcSession(
  raw: string,
  secret = sessionSecret()
): TelegramUser {
  if (!isTelegramOidcSessionPayload(raw)) {
    throw new AppError("UNAUTHORIZED", "Invalid Telegram OpenID session", 401);
  }

  const packed = raw.slice(OIDC_SESSION_PREFIX.length);
  const dot = packed.lastIndexOf(".");
  if (dot <= 0) {
    throw new AppError("UNAUTHORIZED", "Invalid Telegram OpenID session", 401);
  }

  const body = packed.slice(0, dot);
  const sig = packed.slice(dot + 1);
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64url");

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (
    sigBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expectedBuf)
  ) {
    throw new AppError("UNAUTHORIZED", "Invalid Telegram OpenID session", 401);
  }

  let parsed: {
    id?: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    exp?: number;
  };
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    throw new AppError("UNAUTHORIZED", "Invalid Telegram OpenID session", 401);
  }

  const exp = Number(parsed.exp);
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) {
    throw new AppError("UNAUTHORIZED", "Expired Telegram auth data", 401);
  }

  return telegramUserSchema.parse({
    id: parsed.id,
    first_name: parsed.first_name,
    last_name: parsed.last_name,
    username: parsed.username,
    photo_url: parsed.photo_url
  });
}
