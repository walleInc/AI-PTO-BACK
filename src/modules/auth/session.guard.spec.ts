import { UnauthorizedException } from "@nestjs/common";
import { SessionGuard } from "./session.guard.js";
import type { SessionService } from "./session.service.js";
import { SESSION_COOKIE_NAME } from "./auth.constants.js";

function mockContext(cookies: Record<string, string> | undefined) {
  const req: { cookies?: Record<string, string>; user?: unknown } = { cookies };
  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
    req,
  };
}

describe("SessionGuard", () => {
  const getSessionUser = jest.fn();
  const sessions = { getSessionUser } as unknown as SessionService;
  const guard = new SessionGuard(sessions);

  beforeEach(() => {
    getSessionUser.mockReset();
  });

  it("rejects missing cookie with 401", async () => {
    const ctx = mockContext(undefined);
    await expect(guard.canActivate(ctx as never)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects unknown session with 401", async () => {
    getSessionUser.mockResolvedValue(null);
    const ctx = mockContext({ [SESSION_COOKIE_NAME]: "missing" });
    await expect(guard.canActivate(ctx as never)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("attaches user when session exists", async () => {
    const user = {
      id: "1",
      email: "a@b.c",
      name: "A",
      organizationId: "org",
      role: "engineer" as const,
    };
    getSessionUser.mockResolvedValue(user);
    const ctx = mockContext({ [SESSION_COOKIE_NAME]: "sid" });
    await expect(guard.canActivate(ctx as never)).resolves.toBe(true);
    expect(ctx.req.user).toEqual(user);
  });
});
