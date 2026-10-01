import { UnauthorizedException } from "@nestjs/common";
import { SessionGuard } from "./session.guard";
import type { SessionService } from "./session.service";
import { SESSION_COOKIE_NAME } from "./auth.constants";

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
  const getSession = jest.fn();
  const sessions = { getSession } as unknown as SessionService;
  const guard = new SessionGuard(sessions);

  beforeEach(() => {
    getSession.mockReset();
  });

  it("rejects missing cookie with 401", async () => {
    const ctx = mockContext(undefined);
    await expect(guard.canActivate(ctx as never)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects unknown session with 401", async () => {
    getSession.mockResolvedValue(null);
    const ctx = mockContext({ [SESSION_COOKIE_NAME]: "missing" });
    await expect(guard.canActivate(ctx as never)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("attaches user when session exists", async () => {
    const user = {
      id: "1",
      email: "a@b.c",
      name: "A",
      organizationId: "org",
      organizationName: "",
      role: "engineer" as const,
    };
    getSession.mockResolvedValue(user);
    const ctx = mockContext({ [SESSION_COOKIE_NAME]: "sid" });
    await expect(guard.canActivate(ctx as never)).resolves.toBe(true);
    expect(ctx.req.user).toEqual(user);
  });
});
