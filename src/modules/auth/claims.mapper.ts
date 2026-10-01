import type { User, UserRole } from "../../common/dto/openapi.types";

const ORG_CLAIM = "urn:zitadel:iam:user:resourceowner:id";
const ORG_NAME_CLAIM = "urn:zitadel:iam:user:resourceowner:name";
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

  const rolesClaim = claims[ROLES_CLAIM];
  const organizationId =
    asNonEmptyString(claims[ORG_CLAIM]) || asNonEmptyString(claims.org_id) || organizationIdFromRoles(rolesClaim);

  return {
    id: sub,
    email,
    name,
    organizationId,
    organizationName: "",
    role: resolveRole(rolesClaim),
  };
}

/** Bootstrap Organization.name: explicit claim, else org label from roles map. */
export function extractOrganizationNameFromClaims(claims: Record<string, unknown>): string {
  const fromClaim = asNonEmptyString(claims[ORG_NAME_CLAIM]);
  const raw = fromClaim || organizationNameFromRoles(claims[ROLES_CLAIM]);
  return formatOrganizationDisplayName(raw);
}

/**
 * Domains like `test.localhost` / `ai-pto.zitadel.ch` → first label, then UPPERCASE.
 * Plain names are only uppercased.
 */
export function formatOrganizationDisplayName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }

  let base = trimmed;
  if (looksLikeDomain(trimmed)) {
    base = trimmed.split(".")[0] ?? trimmed;
  }

  return base.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
}

function looksLikeDomain(value: string): boolean {
  return value.includes(".") && !value.includes(" ");
}

function asNonEmptyString(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
}

/**
 * ZITADEL roles claim shape:
 * { "owner": { "<orgId>": "<orgNameOrDomain>" }, "engineer": { ... } }
 */
function organizationIdFromRoles(rolesClaim: unknown): string {
  const first = firstRoleOrgEntry(rolesClaim);
  return first?.orgId ?? "";
}

function organizationNameFromRoles(rolesClaim: unknown): string {
  const first = firstRoleOrgEntry(rolesClaim);
  return first?.orgLabel ?? "";
}

function firstRoleOrgEntry(rolesClaim: unknown): { orgId: string; orgLabel: string } | null {
  if (!rolesClaim || typeof rolesClaim !== "object") {
    return null;
  }
  for (const roleOrgs of Object.values(rolesClaim as Record<string, unknown>)) {
    if (!roleOrgs || typeof roleOrgs !== "object") {
      continue;
    }
    for (const [orgId, label] of Object.entries(roleOrgs as Record<string, unknown>)) {
      const id = asNonEmptyString(orgId);
      if (!id) {
        continue;
      }
      return { orgId: id, orgLabel: asNonEmptyString(label) };
    }
  }
  return null;
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
