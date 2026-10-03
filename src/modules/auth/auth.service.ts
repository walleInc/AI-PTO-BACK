import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import type { User } from "../../common/dto/openapi.types.js";
import { DB, type AppDb } from "../../prisma/db.token.js";
import { getAuthProvider } from "./auth.constants.js";
import { OidcService } from "./oidc.service.js";
import { hashPassword, verifyPassword } from "./password.js";
import { SessionService, type SessionMeta } from "./session.service.js";

const INVALID_CREDENTIALS = {
  code: "invalid_credentials",
  message: "Неверный email или пароль",
};

const UNAUTHORIZED = { code: "unauthorized", message: "Authentication failed" };

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

  async loginWithPassword(
    email: string,
    password: string,
    meta: SessionMeta = {},
  ): Promise<{ sessionId: string; user: User }> {
    const row = await this.findUserByEmail(email);
    const passwordOk = await verifyPassword(password, row?.passwordHash ?? (await DUMMY_HASH));
    if (!row || !passwordOk) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    return this.openSession(row.id, meta, INVALID_CREDENTIALS);
  }

  private async findUserByEmail(email: string) {
    return this.db.orm.public.User.where({ email: email.trim().toLowerCase() }).first();
  }

  /** Creates a session only for an active user with an active membership. */
  private async openSession(
    userId: string,
    meta: SessionMeta,
    error: { code: string; message: string },
  ): Promise<{ sessionId: string; user: User }> {
    const user = await this.sessions.loadUser(userId);
    if (!user) {
      throw new UnauthorizedException(error);
    }
    const sessionId = await this.sessions.createSession(userId, meta);
    await this.db.orm.public.User.where({ id: userId }).update({
      lastLoginAt: new Date().toISOString(),
    });
    return { sessionId, user };
  }

  async startLogin(): Promise<string> {
    const { state, codeVerifier, codeChallenge } = this.oidc.createPkce();
    await this.sessions.saveOidcState(state, { codeVerifier });
    return this.oidc.buildAuthorizationUrl({ state, codeChallenge });
  }

  async handleCallback(
    query: {
      code?: string;
      state?: string;
      error?: string;
      error_description?: string;
    },
    meta: SessionMeta = {},
  ): Promise<{ sessionId: string; user: User }> {
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
      // ZITADEL only authenticates; the user, role and organization come from our DB.
      const claims = tokenSet.claims();
      const email = typeof claims.email === "string" ? claims.email : "";
      const row = email && claims.email_verified !== false ? await this.findUserByEmail(email) : null;
      if (!row) {
        throw new Error("No local user for OIDC identity");
      }
      return await this.openSession(row.id, meta, UNAUTHORIZED);
    } catch {
      throw new UnauthorizedException({
        code: "unauthorized",
        message: "Authentication failed",
      });
    }
  }

  async logout(sessionId: string | undefined): Promise<void> {
    if (sessionId) {
      await this.sessions.revokeSession(sessionId);
    }
  }
}
