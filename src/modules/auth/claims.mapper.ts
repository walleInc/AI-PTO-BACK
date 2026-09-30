import type { User, UserRole } from "../../common/dto/openapi.types";

const ORG_CLAIM = "urn:zitadel:iam:user:resourceowner:id";
const ROLES_CLAIM = "urn:zitadel:iam:org:project:roles";

const ALLOWED_ROLES: UserRole[] = ["owner", "engineer"];

export function mapOidcClaimsToUser(claims: Record<string, unknown>): User {
  const sub = claims.sub;
  if (typeof sub !== "string" || !sub) {
    throw new Error("OIDC claims missing sub");
  }

  const email = typeof claims.email === "string" ? claims.email : "";
  const name =
    typeof claims.name === "string"
      ? claims.name
      : typeof claims.preferred_username === "string"
        ? claims.preferred_username
        : "";

  const orgFromClaim = claims[ORG_CLAIM];
  const orgFallback = claims.org_id;
  const organizationId =
    typeof orgFromClaim === "string"
      ? orgFromClaim
      : typeof orgFallback === "string"
        ? orgFallback
        : "";

  return {
    id: sub,
    email,
    name,
    organizationId,
    role: resolveRole(claims[ROLES_CLAIM]),
  };
}

function resolveRole(rolesClaim: unknown): UserRole {
  if (!rolesClaim || typeof rolesClaim !== "object") {
    return "engineer";
  }
  const keys = Object.keys(rolesClaim);
  for (const key of keys) {
    if (ALLOWED_ROLES.includes(key as UserRole)) {
      return key as UserRole;
    }
  }
  return "engineer";
}
