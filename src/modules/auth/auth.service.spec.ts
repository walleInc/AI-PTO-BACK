import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import type { AppDb } from "../../prisma/db.token";
import { AuthService } from "./auth.service";
import type { OidcService } from "./oidc.service";
import { hashPassword } from "./password";
import type { SessionService } from "./session.service";

const noDb = {} as AppDb;

describe("AuthService.logout", () => {
  it("deletes session when cookie present", async () => {
    const deleteSession = jest.fn().mockResolvedValue(undefined);
    const sessions = { deleteSession } as unknown as SessionService;
    const oidc = {} as OidcService;
    const service = new AuthService(oidc, sessions, noDb);
    await service.logout("sid-1");
    expect(deleteSession).toHaveBeenCalledWith("sid-1");
  });

  it("no-ops when cookie missing", async () => {
    const deleteSession = jest.fn();
    const sessions = { deleteSession } as unknown as SessionService;
    const service = new AuthService({} as OidcService, sessions, noDb);
    await service.logout(undefined);
    expect(deleteSession).not.toHaveBeenCalled();
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

  async function setup(opts: {
    user?: Record<string, unknown> | null;
    memberships?: Array<Record<string, unknown>>;
  }) {
    const userRow =
      opts.user === null
        ? null
        : {
            id: "user-1",
            email: "eng@example.com",
            name: "Инженер",
            status: "active",
            passwordHash: await hashPassword("correct-password"),
            ...opts.user,
          };
    const userUpdate = jest.fn().mockResolvedValue(undefined);
    const db = {
      orm: {
        public: {
          User: {
            where: jest.fn(() => ({
              first: jest.fn().mockResolvedValue(userRow),
              update: userUpdate,
            })),
          },
          Membership: {
            where: jest.fn(() => ({
              include: () => ({
                orderBy: () => ({
                  all: jest.fn().mockResolvedValue(
                    opts.memberships ?? [
                      {
                        organizationId: "org-1",
                        role: "owner",
                        organization: { status: "active" },
                      },
                    ],
                  ),
                }),
              }),
            })),
          },
        },
      },
    } as unknown as AppDb;
    const createSession = jest.fn().mockResolvedValue("sid-1");
    const service = new AuthService(
      {} as OidcService,
      { createSession } as unknown as SessionService,
      db,
    );
    return { service, createSession, userUpdate };
  }

  it("creates a session and returns the user for valid credentials", async () => {
    const { service, createSession, userUpdate } = await setup({});
    const result = await service.loginWithPassword(" Eng@Example.com ", "correct-password");
    expect(result).toEqual({
      sessionId: "sid-1",
      user: {
        id: "user-1",
        email: "eng@example.com",
        name: "Инженер",
        organizationId: "org-1",
        role: "owner",
      },
    });
    expect(createSession).toHaveBeenCalledWith(result.user);
    expect(userUpdate).toHaveBeenCalledWith({ lastLoginAt: expect.any(String) });
  });

  it.each([
    ["wrong password", { user: {} }, "wrong"],
    ["unknown email", { user: null }, "correct-password"],
    ["disabled user", { user: { status: "disabled" } }, "correct-password"],
    ["no memberships", { user: {}, memberships: [] }, "correct-password"],
    [
      "inactive organization",
      { user: {}, memberships: [{ organizationId: "o", role: "owner", organization: { status: "suspended" } }] },
      "correct-password",
    ],
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
