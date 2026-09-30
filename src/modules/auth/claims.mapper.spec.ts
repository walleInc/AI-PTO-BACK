import { mapOidcClaimsToUser } from "./claims.mapper";

describe("mapOidcClaimsToUser", () => {
  it("maps core claims and defaults role to engineer", () => {
    const user = mapOidcClaimsToUser({
      sub: "user-1",
      email: "a@example.com",
      name: "Alice",
      "urn:zitadel:iam:user:resourceowner:id": "org-9",
    });
    expect(user).toEqual({
      id: "user-1",
      email: "a@example.com",
      name: "Alice",
      organizationId: "org-9",
      role: "engineer",
    });
  });

  it("prefers preferred_username when name is missing", () => {
    const user = mapOidcClaimsToUser({
      sub: "user-2",
      preferred_username: "bob",
    });
    expect(user.name).toBe("bob");
    expect(user.organizationId).toBe("");
  });

  it("picks owner role from ZITADEL roles claim", () => {
    const user = mapOidcClaimsToUser({
      sub: "user-3",
      "urn:zitadel:iam:org:project:roles": {
        owner: { "org-1": "org-1.zitadel.ch" },
      },
    });
    expect(user.role).toBe("owner");
  });

  it("throws when sub is missing", () => {
    expect(() => mapOidcClaimsToUser({ email: "x@y.z" })).toThrow(/sub/);
  });
});
