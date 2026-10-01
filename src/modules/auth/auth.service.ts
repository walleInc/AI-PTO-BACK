import { BadRequestException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { User } from "../../common/dto/openapi.types";
import { DB, type AppDb } from "../../prisma/db.token";
import { extractOrganizationNameFromClaims, formatOrganizationDisplayName, mapOidcClaimsToUser } from "./claims.mapper";
import { OidcService } from "./oidc.service";
import { SessionService } from "./session.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly oidc: OidcService,
    private readonly sessions: SessionService,
    @Inject(DB) private readonly db: AppDb,
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
      const claims = await this.oidc.loadClaims(tokenSet);
      const user = mapOidcClaimsToUser(claims);
      const claimOrgName = extractOrganizationNameFromClaims(claims);
      await this.ensureOrganization(user.organizationId, claimOrgName);
      const sessionId = await this.sessions.createSession(user);
      return { sessionId, user };
    } catch {
      throw new UnauthorizedException({
        code: "unauthorized",
        message: "Authentication failed",
      });
    }
  }

  async enrichUser(user: User): Promise<User> {
    const organizationName = await this.resolveOrganizationName(user.organizationId);
    return { ...user, organizationName };
  }

  async logout(sessionId: string | undefined): Promise<void> {
    if (sessionId) {
      await this.sessions.deleteSession(sessionId);
    }
  }

  /**
   * Upsert tenant Organization by ZITADEL externalId.
   * Claim name only bootstraps empty/missing rows — Postgres name is source of truth.
   */
  async ensureOrganization(externalId: string, claimName: string): Promise<void> {
    if (!externalId) {
      return;
    }

    const existing = await this.db.orm.public.Organization.where({
      externalId,
    }).first();

    if (existing) {
      const formatted = formatOrganizationDisplayName(claimName || existing.name);
      if (formatted && existing.name !== formatted && (!existing.name || looksLikeDomainName(existing.name))) {
        await this.db.orm.public.Organization.where({ id: existing.id }).update({
          name: formatted,
        });
      }
      return;
    }

    const name = formatOrganizationDisplayName(claimName || externalId) || externalId;
    await this.db.orm.public.Organization.create({
      id: randomUUID(),
      name,
      slug: organizationSlug(externalId),
      kind: "tenant",
      status: "active",
      externalId,
    });
  }

  async resolveOrganizationName(externalId: string): Promise<string> {
    if (!externalId) {
      return "";
    }
    const org = await this.db.orm.public.Organization.where({
      externalId,
    }).first();
    return org?.name ?? "";
  }
}

function organizationSlug(externalId: string): string {
  const safe = externalId.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 48);
  return `ext-${safe || "org"}`;
}

function looksLikeDomainName(value: string): boolean {
  return value.includes(".") && !value.includes(" ");
}
