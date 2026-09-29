import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { User } from "../../common/dto/openapi.types";
import { mapOidcClaimsToUser } from "./claims.mapper";
import { OidcService } from "./oidc.service";
import { SessionService } from "./session.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly oidc: OidcService,
    private readonly sessions: SessionService,
  ) {}

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
