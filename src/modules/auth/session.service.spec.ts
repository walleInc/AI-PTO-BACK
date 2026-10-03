import type { AppDb } from "../../prisma/db.token.js";
import { hashSessionToken, SessionService } from "./session.service.js";

const activeUser = { id: "u1", email: "a@b.c", name: "A", status: "active" };
const activeMembership = {
  organizationId: "org-1",
  role: "engineer",
  organization: { status: "active" },
};

function setup(opts: {
  session?: Record<string, unknown> | null;
  user?: Record<string, unknown> | null;
  memberships?: unknown[];
}) {
  const sessionUpdate = jest.fn().mockResolvedValue(undefined);
  const sessionCreate = jest.fn().mockResolvedValue(undefined);
  const session = opts.session === null ? null : {
    id: "s1",
    userId: "u1",
    revokedAt: null,
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    lastSeenAt: new Date().toISOString(),
    ...opts.session,
  };
  const user = opts.user === undefined ? activeUser : opts.user;
  const db = {
    orm: {
      public: {
        Session: {
          where: jest.fn(() => ({ first: jest.fn().mockResolvedValue(session), update: sessionUpdate })),
          create: sessionCreate,
        },
        User: { where: jest.fn(() => ({ first: jest.fn().mockResolvedValue(user) })) },
        Membership: {
          where: jest.fn(() => ({
            include: () => ({
              orderBy: () => ({
                all: jest.fn().mockResolvedValue(opts.memberships ?? [activeMembership]),
              }),
            }),
          })),
        },
      },
    },
  } as unknown as AppDb;
  return { service: new SessionService(db), db, sessionUpdate, sessionCreate };
}

describe("SessionService", () => {
  it("stores only the token hash and returns the raw token", async () => {
    const { service, sessionCreate } = setup({});
    const token = await service.createSession("u1", { userAgent: "ua", ip: "1.1.1.1" });
    const row = sessionCreate.mock.calls[0][0] as Record<string, string>;
    expect(row.tokenHash).toBe(hashSessionToken(token));
    expect(row.tokenHash).not.toBe(token);
    expect(row).toMatchObject({ userId: "u1", userAgent: "ua", ip: "1.1.1.1" });
    expect(Date.parse(row.expiresAt)).toBeGreaterThan(Date.now());
  });

  it("builds the user from live membership, not from the session", async () => {
    const { service } = setup({});
    await expect(service.getSessionUser("tok")).resolves.toEqual({
      id: "u1",
      email: "a@b.c",
      name: "A",
      organizationId: "org-1",
      role: "engineer",
    });
  });

  it.each([
    ["unknown token", { session: null }],
    ["revoked session", { session: { revokedAt: new Date().toISOString() } }],
    ["expired session", { session: { expiresAt: new Date(Date.now() - 1000).toISOString() } }],
    ["deleted user", { user: null }],
    ["blocked user", { user: { ...activeUser, status: "disabled" } }],
    ["no active membership", { memberships: [] }],
    [
      "suspended organization",
      { memberships: [{ ...activeMembership, organization: { status: "suspended" } }] },
    ],
  ])("rejects %s", async (_label, opts) => {
    const { service } = setup(opts);
    await expect(service.getSessionUser("tok")).resolves.toBeNull();
  });

  it("touches lastSeenAt only when it is stale", async () => {
    const fresh = setup({});
    await fresh.service.getSessionUser("tok");
    expect(fresh.sessionUpdate).not.toHaveBeenCalled();

    const stale = setup({ session: { lastSeenAt: new Date(Date.now() - 120_000).toISOString() } });
    await stale.service.getSessionUser("tok");
    expect(stale.sessionUpdate).toHaveBeenCalledWith({ lastSeenAt: expect.any(String) });
  });

  it("revokes by token hash", async () => {
    const { service, db, sessionUpdate } = setup({});
    await service.revokeSession("tok");
    expect(db.orm.public.Session.where).toHaveBeenCalledWith({ tokenHash: hashSessionToken("tok") });
    expect(sessionUpdate).toHaveBeenCalledWith({ revokedAt: expect.any(String) });
  });
});
