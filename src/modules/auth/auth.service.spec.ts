import { UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import type { OidcService } from "./oidc.service";
import type { SessionService } from "./session.service";

describe("AuthService.logout", () => {
  it("deletes session when cookie present", async () => {
    const deleteSession = jest.fn().mockResolvedValue(undefined);
    const sessions = { deleteSession } as unknown as SessionService;
    const oidc = {} as OidcService;
    const service = new AuthService(oidc, sessions);
    await service.logout("sid-1");
    expect(deleteSession).toHaveBeenCalledWith("sid-1");
  });

  it("no-ops when cookie missing", async () => {
    const deleteSession = jest.fn();
    const sessions = { deleteSession } as unknown as SessionService;
    const service = new AuthService({} as OidcService, sessions);
    await service.logout(undefined);
    expect(deleteSession).not.toHaveBeenCalled();
  });
});

describe("AuthService.handleCallback", () => {
  it("returns 401 without leaking oidc error details", async () => {
    const sessions = {
      takeOidcState: jest.fn().mockResolvedValue(null),
    } as unknown as SessionService;
    const service = new AuthService({} as OidcService, sessions);
    await expect(
      service.handleCallback({ code: "c", state: "s", error: "access_denied" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
