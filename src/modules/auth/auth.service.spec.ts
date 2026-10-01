import { UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import type { OidcService } from "./oidc.service";
import type { SessionService } from "./session.service";
import type { AppDb } from "../../prisma/db.token";

function mockDb(
  overrides: {
    first?: jest.Mock;
    create?: jest.Mock;
    update?: jest.Mock;
  } = {},
): AppDb {
  const first = overrides.first ?? jest.fn().mockResolvedValue(null);
  const create = overrides.create ?? jest.fn().mockResolvedValue(undefined);
  const update = overrides.update ?? jest.fn().mockResolvedValue(undefined);
  const where = jest.fn().mockReturnValue({ first, update });
  return {
    orm: {
      public: {
        Organization: { where, create },
      },
    },
  } as unknown as AppDb;
}

describe("AuthService.logout", () => {
  it("deletes session when cookie present", async () => {
    const deleteSession = jest.fn().mockResolvedValue(undefined);
    const sessions = { deleteSession } as unknown as SessionService;
    const oidc = {} as OidcService;
    const service = new AuthService(oidc, sessions, mockDb());
    await service.logout("sid-1");
    expect(deleteSession).toHaveBeenCalledWith("sid-1");
  });

  it("no-ops when cookie missing", async () => {
    const deleteSession = jest.fn();
    const sessions = { deleteSession } as unknown as SessionService;
    const service = new AuthService({} as OidcService, sessions, mockDb());
    await service.logout(undefined);
    expect(deleteSession).not.toHaveBeenCalled();
  });
});

describe("AuthService.handleCallback", () => {
  it("returns 401 without leaking oidc error details", async () => {
    const sessions = {
      takeOidcState: jest.fn().mockResolvedValue(null),
    } as unknown as SessionService;
    const service = new AuthService({} as OidcService, sessions, mockDb());
    await expect(service.handleCallback({ code: "c", state: "s", error: "access_denied" })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("maps user from loadClaims (ID token + UserInfo merge)", async () => {
    const sessions = {
      takeOidcState: jest.fn().mockResolvedValue({ codeVerifier: "v", createdAt: 1 }),
      createSession: jest.fn().mockResolvedValue("sid-99"),
    } as unknown as SessionService;
    const oidc = {
      exchangeCode: jest.fn().mockResolvedValue({ access_token: "at" }),
      loadClaims: jest.fn().mockResolvedValue({
        sub: "user-1",
        email: "a@b.c",
        name: "Alice",
        "urn:zitadel:iam:user:resourceowner:id": "org-42",
        "urn:zitadel:iam:user:resourceowner:name": "Acme",
        "urn:zitadel:iam:org:project:roles": { owner: { "org-42": "x" } },
      }),
    } as unknown as OidcService;
    const create = jest.fn().mockResolvedValue(undefined);
    const first = jest.fn().mockResolvedValue(null);
    const service = new AuthService(oidc, sessions, mockDb({ create, first }));

    const result = await service.handleCallback({ code: "c", state: "s" });

    expect(oidc.loadClaims).toHaveBeenCalled();
    expect(result.sessionId).toBe("sid-99");
    expect(result.user).toMatchObject({
      id: "user-1",
      organizationId: "org-42",
      role: "owner",
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ externalId: "org-42", name: "ACME" }));
  });
});

describe("AuthService.ensureOrganization", () => {
  it("creates organization when missing", async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const first = jest.fn().mockResolvedValue(null);
    const db = mockDb({ create, first });
    const service = new AuthService({} as OidcService, {} as SessionService, db);

    await service.ensureOrganization("zitadel-org-1", "Acme Corp");

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "ACME CORP",
        externalId: "zitadel-org-1",
        kind: "tenant",
        status: "active",
        slug: "ext-zitadel-org-1",
      }),
    );
  });

  it("does not overwrite existing non-empty name", async () => {
    const update = jest.fn();
    const create = jest.fn();
    const first = jest.fn().mockResolvedValue({
      id: "org-uuid",
      name: "Stored Name",
      externalId: "zitadel-org-1",
    });
    const db = mockDb({ create, first, update });
    const service = new AuthService({} as OidcService, {} as SessionService, db);

    await service.ensureOrganization("zitadel-org-1", "Claim Name");

    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("fills empty name from claim", async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const first = jest.fn().mockResolvedValue({
      id: "org-uuid",
      name: "",
      externalId: "zitadel-org-1",
    });
    const db = mockDb({ first, update });
    const service = new AuthService({} as OidcService, {} as SessionService, db);

    await service.ensureOrganization("zitadel-org-1", "From Claim");

    expect(update).toHaveBeenCalledWith({ name: "FROM CLAIM" });
  });

  it("reformats domain-like existing name on login", async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const first = jest.fn().mockResolvedValue({
      id: "org-uuid",
      name: "test.localhost",
      externalId: "zitadel-org-1",
    });
    const db = mockDb({ first, update });
    const service = new AuthService({} as OidcService, {} as SessionService, db);

    await service.ensureOrganization("zitadel-org-1", "test.localhost");

    expect(update).toHaveBeenCalledWith({ name: "TEST" });
  });

  it("no-ops when externalId is empty", async () => {
    const first = jest.fn();
    const db = mockDb({ first });
    const service = new AuthService({} as OidcService, {} as SessionService, db);
    await service.ensureOrganization("", "Name");
    expect(first).not.toHaveBeenCalled();
  });
});

describe("AuthService.enrichUser", () => {
  it("sets organizationName from Postgres", async () => {
    const first = jest.fn().mockResolvedValue({ name: "Postgres Org" });
    const db = mockDb({ first });
    const service = new AuthService({} as OidcService, {} as SessionService, db);

    const enriched = await service.enrichUser({
      id: "u1",
      email: "a@b.c",
      name: "A",
      organizationId: "ext-1",
      organizationName: "",
      role: "engineer",
    });

    expect(enriched.organizationName).toBe("Postgres Org");
  });

  it("returns empty name when org not found", async () => {
    const first = jest.fn().mockResolvedValue(null);
    const db = mockDb({ first });
    const service = new AuthService({} as OidcService, {} as SessionService, db);

    const enriched = await service.enrichUser({
      id: "u1",
      email: "a@b.c",
      name: "A",
      organizationId: "missing",
      organizationName: "",
      role: "owner",
    });

    expect(enriched.organizationName).toBe("");
  });
});
