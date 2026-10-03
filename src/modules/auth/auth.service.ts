import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import type { User } from "../../common/dto/openapi.types";
import { DB, type AppDb } from "../../prisma/db.token";
import { getAuthProvider } from "./auth.constants";
import { mapOidcClaimsToUser } from "./claims.mapper";
import { OidcService } from "./oidc.service";
import { hashPassword, verifyPassword } from "./password";
import { SessionService } from "./session.service";

const INVALID_CREDENTIALS = {
  code: "invalid_credentials",
  message: "Неверный email или пароль",
};

// Hash of a random password: lets login spend the same time for unknown emails.
const DUMMY_HASH = hashPassword(`dummy-${Date.now()}-${Math.random()}`);

@Injectable()
export class AuthService {
  constructor(
    private readonly oidc: OidcService,
    private readonly sessions: SessionService,
    @Inject(DB) private readonly db: AppDb,
  ) {}

  /** OIDC flow (`/auth/login` GET, `/auth/callback`) exists only with AUTH_PROVIDER=zitadel. */
  assertProvider(expected: "zitadel" | "local"): void {
    if (getAuthProvider() !== expected) {
      throw new NotFoundException({
        code: "not_found",
        message: "Этот способ входа отключён",
      });
    }
  }

  async loginWithPassword(email: string, password: string): Promise<{ sessionId: string; user: User }> {
    const normalizedEmail = email.trim().toLowerCase();
    const row = await this.db.orm.public.User.where({ email: normalizedEmail }).first();
    const passwordOk = await verifyPassword(password, row?.passwordHash ?? (await DUMMY_HASH));
    if (!row || !passwordOk || row.status !== "active") {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const memberships = await this.db.orm.public.Membership.where({
      userId: row.id,
      status: "active",
    })
      .include("organization")
      .orderBy((m) => m.createdAt.asc())
      .all();
    const membership = memberships.find((m) => m.organization?.status === "active");
    if (!membership) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const user: User = {
      id: row.id,
      email: row.email,
      name: row.name,
      organizationId: membership.organizationId,
      role: membership.role,
    };
    const sessionId = await this.sessions.createSession(user);
    await this.db.orm.public.User.where({ id: row.id }).update({
      lastLoginAt: new Date().toISOString(),
    });
    return { sessionId, user };
  }

  async startLogin(): Promise<string> {
    const { state, codeVerifier, codeChallenge } = this.oidc.createPkce();
    await this.sessions.saveOidcState(state, {
      codeVerifier,
      createdAt: Date.now(),
    });
    return this.oidc.buildAuthorizationUrl({ state, codeChallenge });
  }

  async handleCallback(query: {
    code?: string;
    state?: string;
    error?: string;
    error_description?: string;
  }): Promise<{ sessionId: string; user: User }> {
    if (query.error) {
      throw new UnauthorizedException({
        code: "unauthorized",
        message: "Authentication failed",
      });
    }

    const { code, state } = query;
    if (!code || !state) {
      throw new BadRequestException({
        code: "validation_error",
        message: "Missing code or state",
        details: [
          ...(!code ? [{ field: "code", message: "required" }] : []),
          ...(!state ? [{ field: "state", message: "required" }] : []),
        ],
      });
    }

    const pending = await this.sessions.takeOidcState(state);
    if (!pending) {
      throw new UnauthorizedException({
        code: "unauthorized",
        message: "Authentication failed",
      });
    }

    try {
      const tokenSet = await this.oidc.exchangeCode({
        code,
        state,
        codeVerifier: pending.codeVerifier,
      });
      const claims = tokenSet.claims() as Record<string, unknown>;
      const user = mapOidcClaimsToUser(claims);
      const sessionId = await this.sessions.createSession(user);
      return { sessionId, user };
    } catch {
      throw new UnauthorizedException({
        code: "unauthorized",
        message: "Authentication failed",
      });
    }
  }

  async logout(sessionId: string | undefined): Promise<void> {
    if (sessionId) {
      await this.sessions.deleteSession(sessionId);
    }
  }
}
