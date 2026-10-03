import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import type { AppDb } from "../../prisma/db.token";
import { AuthService } from "./auth.service";
import type { OidcService } from "./oidc.service";
import { hashPassword } from "./password";
import type { SessionService } from "./session.service";

const noDb = {} as AppDb;

describe("AuthService.logout", () => {
  it("deletes session when cookie present", async () => {
    const revokeSession = jest.fn().mockResolvedValue(undefined);
    const sessions = { revokeSession } as unknown as SessionService;
    const oidc = {} as OidcService;
    const service = new AuthService(oidc, sessions, noDb);
    await service.logout("sid-1");
    expect(revokeSession).toHaveBeenCalledWith("sid-1");
  });

  it("no-ops when cookie missing", async () => {
    const revokeSession = jest.fn();
    const sessions = { revokeSession } as unknown as SessionService;
    const service = new AuthService({} as OidcService, sessions, noDb);
    await service.logout(undefined);
    expect(revokeSession).not.toHaveBeenCalled();
  });
});

describe("AuthService.handleCallback", () => {
  it("returns 401 without leaking oidc error details", async () => {
    const sessions = {
      takeOidcState: jest.fn().mockResolvedValue(null),
    } as unknown as SessionService;
    const service = new AuthService({} as OidcService, sessions, noDb);
    await expect(
      service.handleCallback({ code: "c", state: "s", error: "access_denied" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe("AuthService.loginWithPassword", () => {
  const OLD_PROVIDER = process.env.AUTH_PROVIDER;
  afterEach(() => {
    if (OLD_PROVIDER === undefined) {
      delete process.env.AUTH_PROVIDER;
    } else {
      process.env.AUTH_PROVIDER = OLD_PROVIDER;
    }
  });

  const identity = {
    id: "user-1",
    email: "eng@example.com",
    name: "Инженер",
    organizationId: "org-1",
    role: "owner" as const,
  };

  async function setup(opts: { user?: boolean; identity?: typeof identity | null }) {
    const userRow = opts.user === false ? null : { id: "user-1", passwordHash: await hashPassword("correct-password") };
    const where = jest.fn(() => ({
      first: jest.fn().mockResolvedValue(userRow),
      update: userUpdate,
    }));
    const userUpdate = jest.fn().mockResolvedValue(undefined);
    const db = { orm: { public: { User: { where } } } } as unknown as AppDb;
    const loadUser = jest.fn().mockResolvedValue(opts.identity === undefined ? identity : opts.identity);
    const createSession = jest.fn().mockResolvedValue("token-1");
    const service = new AuthService(
      {} as OidcService,
      { loadUser, createSession } as unknown as SessionService,
      db,
    );
    return { service, where, createSession, userUpdate };
  }

  it("creates a session and returns the user for valid credentials", async () => {
    const { service, where, createSession, userUpdate } = await setup({});
    const meta = { userAgent: "ua", ip: "1.2.3.4" };
    const result = await service.loginWithPassword(" Eng@Example.com ", "correct-password", meta);
    expect(result).toEqual({ sessionId: "token-1", user: identity });
    expect(where).toHaveBeenCalledWith({ email: "eng@example.com" });
    expect(createSession).toHaveBeenCalledWith("user-1", meta);
    expect(userUpdate).toHaveBeenCalledWith({ lastLoginAt: expect.any(String) });
  });

  it.each([
    ["wrong password", {}, "wrong"],
    ["unknown email", { user: false }, "correct-password"],
    ["blocked user or no active membership", { identity: null }, "correct-password"],
  ])("rejects with invalid_credentials: %s", async (_label, opts, password) => {
    const { service, createSession } = await setup(opts);
    await expect(service.loginWithPassword("eng@example.com", password)).rejects.toMatchObject({
      response: { code: "invalid_credentials" },
    });
    expect(createSession).not.toHaveBeenCalled();
  });

  it("assertProvider hides the disabled flow", () => {
    const service = new AuthService({} as OidcService, {} as SessionService, noDb);
    process.env.AUTH_PROVIDER = "local";
    expect(() => service.assertProvider("zitadel")).toThrow(NotFoundException);
    expect(() => service.assertProvider("local")).not.toThrow();
    process.env.AUTH_PROVIDER = "zitadel";
    expect(() => service.assertProvider("local")).toThrow(NotFoundException);
  });
});
