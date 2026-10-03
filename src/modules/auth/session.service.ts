import { Inject, Injectable } from "@nestjs/common";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { User } from "../../common/dto/openapi.types.js";
import { DB, type AppDb } from "../../prisma/db.token.js";
import { getSessionTtlSeconds, OIDC_STATE_TTL_SECONDS } from "./auth.constants.js";

export interface OidcPendingState {
  codeVerifier: string;
}

export interface SessionMeta {
  userAgent?: string;
  ip?: string;
}

/** `lastSeenAt` is refreshed at most this often, so reads stay read-only most of the time. */
const TOUCH_INTERVAL_MS = 60_000;

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Opaque sessions in PostgreSQL. The cookie holds a random token, the DB only its SHA-256.
 * Role and organization are never copied into the session: every request re-reads the user
 * and membership, so a role change or a blocked user takes effect immediately.
 */
@Injectable()
export class SessionService {
  constructor(@Inject(DB) private readonly db: AppDb) {}

  /** Current identity for an active user with an active membership in an active organization. */
  async loadUser(userId: string): Promise<User | null> {
    const user = await this.db.orm.public.User.where({ id: userId }).first();
    if (!user || user.status !== "active") {
      return null;
    }
    const memberships = await this.db.orm.public.Membership.where({
      userId,
      status: "active",
    })
      .include("organization")
      .orderBy((m) => m.createdAt.asc())
      .all();
    const membership = memberships.find((m) => m.organization?.status === "active");
    if (!membership) {
      return null;
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      organizationId: membership.organizationId,
      role: membership.role,
    };
  }

  /** Returns the raw token for the cookie; it is not recoverable from the DB. */
  async createSession(userId: string, meta: SessionMeta = {}): Promise<string> {
    const token = randomBytes(32).toString("base64url");
    const now = Date.now();
    await this.db.orm.public.Session.create({
      id: randomUUID(),
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt: new Date(now + getSessionTtlSeconds() * 1000).toISOString(),
      userAgent: meta.userAgent?.slice(0, 512) ?? null,
      ip: meta.ip ?? null,
    });
    return token;
  }

  async getSessionUser(token: string): Promise<User | null> {
    const session = await this.db.orm.public.Session.where({
      tokenHash: hashSessionToken(token),
    }).first();
    if (!session || session.revokedAt || Date.parse(session.expiresAt) <= Date.now()) {
      return null;
    }
    const user = await this.loadUser(session.userId);
    if (user && Date.now() - Date.parse(session.lastSeenAt) > TOUCH_INTERVAL_MS) {
      await this.db.orm.public.Session.where({ id: session.id }).update({
        lastSeenAt: new Date().toISOString(),
      });
    }
    return user;
  }

  async revokeSession(token: string): Promise<void> {
    await this.db.orm.public.Session.where({
      tokenHash: hashSessionToken(token),
    }).update({ revokedAt: new Date().toISOString() });
  }

  async saveOidcState(state: string, payload: OidcPendingState): Promise<void> {
    const now = new Date();
    await this.db.orm.public.OidcState.where((s) => s.expiresAt.lt(now.toISOString())).delete();
    await this.db.orm.public.OidcState.create({
      state,
      codeVerifier: payload.codeVerifier,
      expiresAt: new Date(now.getTime() + OIDC_STATE_TTL_SECONDS * 1000).toISOString(),
    });
  }

  /** One-time read: the state row is deleted whether or not it is still valid. */
  async takeOidcState(state: string): Promise<OidcPendingState | null> {
    const row = await this.db.orm.public.OidcState.where({ state }).first();
    if (!row) {
      return null;
    }
    await this.db.orm.public.OidcState.where({ state }).delete();
    if (Date.parse(row.expiresAt) <= Date.now()) {
      return null;
    }
    return { codeVerifier: row.codeVerifier };
  }
}
