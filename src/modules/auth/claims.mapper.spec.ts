import { extractOrganizationNameFromClaims, formatOrganizationDisplayName, mapOidcClaimsToUser } from "./claims.mapper";

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
      organizationName: "",
      role: "engineer",
    });
  });

  it("extracts organization name claim for bootstrap as UPPERCASE", () => {
    expect(
      extractOrganizationNameFromClaims({
        "urn:zitadel:iam:user:resourceowner:name": " Acme ",
      }),
    ).toBe("ACME");
    expect(extractOrganizationNameFromClaims({})).toBe("");
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
    expect(user.organizationId).toBe("org-1");
  });

  it("derives org id and formats domain label from roles", () => {
    const claims = {
      sub: "user-5",
      "urn:zitadel:iam:org:project:roles": {
        engineer: { "393194001060069381": "test.localhost" },
      },
    };
    const user = mapOidcClaimsToUser(claims);
    expect(user.organizationId).toBe("393194001060069381");
    expect(extractOrganizationNameFromClaims(claims)).toBe("TEST");
  });

  it("coerces numeric resourceowner id from UserInfo JSON", () => {
    const user = mapOidcClaimsToUser({
      sub: "user-4",
      "urn:zitadel:iam:user:resourceowner:id": 123456789012,
    });
    expect(user.organizationId).toBe("123456789012");
  });
});

describe("formatOrganizationDisplayName", () => {
  it("strips domain suffix and uppercases", () => {
    expect(formatOrganizationDisplayName("test.localhost")).toBe("TEST");
    expect(formatOrganizationDisplayName("ai-pto.localhost")).toBe("AI PTO");
  });

  it("uppercases plain names", () => {
    expect(formatOrganizationDisplayName("Acme Corp")).toBe("ACME CORP");
  });
});
