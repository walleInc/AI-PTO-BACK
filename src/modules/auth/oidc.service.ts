import { Injectable, InternalServerErrorException, OnModuleInit, ServiceUnavailableException } from "@nestjs/common";
import { Issuer, generators, type Client, type TokenSet } from "openid-client";
import { loadZitadelPrivateJwks } from "./zitadel-key";

@Injectable()
export class OidcService implements OnModuleInit {
  private client: Client | null = null;
  private redirectUri = "";

  async onModuleInit(): Promise<void> {
    // Lazy-friendly: discovery can fail if ZITADEL is down at boot; retry on first use.
    try {
      await this.ensureClient();
    } catch {
      // Will retry when login/callback is called.
    }
  }

  getRedirectUri(): string {
    return this.redirectUri || this.readRedirectUri();
  }

  createPkce(): { state: string; codeVerifier: string; codeChallenge: string } {
    const codeVerifier = generators.codeVerifier();
    return {
      state: generators.state(),
      codeVerifier,
      codeChallenge: generators.codeChallenge(codeVerifier),
    };
  }

  async buildAuthorizationUrl(params: { state: string; codeChallenge: string }): Promise<string> {
    const client = await this.ensureClient();
    return client.authorizationUrl({
      // projects:roles — org/project roles in token/userinfo without Console claim toggles
      scope: "openid profile email urn:zitadel:iam:org:projects:roles",
      code_challenge: params.codeChallenge,
      code_challenge_method: "S256",
      state: params.state,
    });
  }

  async exchangeCode(params: { code: string; state: string; codeVerifier: string }): Promise<TokenSet> {
    const client = await this.ensureClient();
    return client.callback(
      this.getRedirectUri(),
      { code: params.code, state: params.state },
      { code_verifier: params.codeVerifier, state: params.state },
    );
  }

  /**
   * ID token claims merged with OIDC UserInfo (UserInfo wins on overlap).
   * ZITADEL often puts resourceowner / roles on UserInfo even when ID token is minimal.
   */
  async loadClaims(tokenSet: TokenSet): Promise<Record<string, unknown>> {
    const idClaims = (tokenSet.claims() ?? {}) as Record<string, unknown>;
    const accessToken = tokenSet.access_token;
    if (!accessToken) {
      return idClaims;
    }

    try {
      const client = await this.ensureClient();
      const userinfo = (await client.userinfo(accessToken)) as Record<string, unknown>;
      return { ...idClaims, ...userinfo };
    } catch {
      return idClaims;
    }
  }

  private readRedirectUri(): string {
    const redirectUri = process.env.ZITADEL_REDIRECT_URI;
    if (!redirectUri) {
      throw new InternalServerErrorException({
        code: "oidc_misconfigured",
        message: "ZITADEL_REDIRECT_URI is not set",
      });
    }
    return redirectUri;
  }

  private async ensureClient(): Promise<Client> {
    if (this.client) {
      return this.client;
    }

    const issuerUrl = process.env.ZITADEL_ISSUER;
    const clientId = process.env.ZITADEL_CLIENT_ID;
    const keyPath = process.env.ZITADEL_KEY_PATH?.trim();

    if (!issuerUrl || !clientId) {
      throw new InternalServerErrorException({
        code: "oidc_misconfigured",
        message: "ZITADEL_ISSUER and ZITADEL_CLIENT_ID must be set",
      });
    }
    if (!keyPath) {
      throw new InternalServerErrorException({
        code: "oidc_misconfigured",
        message: "ZITADEL_KEY_PATH must be set for Private Key JWT authentication",
      });
    }

    this.redirectUri = this.readRedirectUri();

    let jwks: { keys: import("jose").JWK[] };
    try {
      jwks = await loadZitadelPrivateJwks(keyPath);
    } catch (err) {
      throw new InternalServerErrorException({
        code: "oidc_misconfigured",
        message: "Failed to load ZITADEL application private key",
        details: [{ message: err instanceof Error ? err.message : String(err) }],
      });
    }

    try {
      const issuer = await Issuer.discover(issuerUrl);
      this.client = new issuer.Client(
        {
          client_id: clientId,
          redirect_uris: [this.redirectUri],
          response_types: ["code"],
          token_endpoint_auth_method: "private_key_jwt",
          token_endpoint_auth_signing_alg: "RS256",
        },
        jwks,
      );
      return this.client;
    } catch (err) {
      if (err instanceof InternalServerErrorException) {
        throw err;
      }
      throw new ServiceUnavailableException({
        code: "oidc_unavailable",
        message: "Unable to reach ZITADEL OIDC discovery endpoint",
        details: [{ message: err instanceof Error ? err.message : String(err) }],
      });
    }
  }
}
