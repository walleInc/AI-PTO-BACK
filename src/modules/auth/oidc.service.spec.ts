import type { TokenSet } from "openid-client";
import { OidcService } from "./oidc.service";

describe("OidcService.loadClaims", () => {
  it("merges UserInfo over ID token claims", async () => {
    const service = Object.create(OidcService.prototype) as OidcService;
    const userinfo = jest.fn().mockResolvedValue({
      "urn:zitadel:iam:user:resourceowner:id": "org-from-userinfo",
      name: "From UserInfo",
    });
    (service as unknown as { ensureClient: () => Promise<{ userinfo: typeof userinfo }> }).ensureClient = jest
      .fn()
      .mockResolvedValue({ userinfo });

    const tokenSet = {
      access_token: "tok",
      claims: () => ({
        sub: "u1",
        name: "From IdToken",
      }),
    } as unknown as TokenSet;

    const claims = await service.loadClaims(tokenSet);

    expect(userinfo).toHaveBeenCalledWith("tok");
    expect(claims).toEqual({
      sub: "u1",
      name: "From UserInfo",
      "urn:zitadel:iam:user:resourceowner:id": "org-from-userinfo",
    });
  });

  it("falls back to ID token when UserInfo fails", async () => {
    const service = Object.create(OidcService.prototype) as OidcService;
    (service as unknown as { ensureClient: () => Promise<{ userinfo: jest.Mock }> }).ensureClient = jest
      .fn()
      .mockResolvedValue({
        userinfo: jest.fn().mockRejectedValue(new Error("userinfo down")),
      });

    const tokenSet = {
      access_token: "tok",
      claims: () => ({ sub: "u1", email: "a@b.c" }),
    } as unknown as TokenSet;

    await expect(service.loadClaims(tokenSet)).resolves.toEqual({
      sub: "u1",
      email: "a@b.c",
    });
  });
});
