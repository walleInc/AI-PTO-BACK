// Creates (or updates the password of) a local-auth user with an active membership.
// Usage: yarn user:create --email a@b.c --password '...' --name 'Имя' --org-slug acme [--org-name 'ACME'] [--role owner|engineer]
// Needs Node >= 22.18 (native TypeScript imports) and DATABASE_URL.
import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import { hashPassword } from "../src/modules/auth/password.ts";
import { db } from "../src/prisma/db.ts";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    password: { type: "string" },
    name: { type: "string" },
    "org-slug": { type: "string" },
    "org-name": { type: "string" },
    role: { type: "string", default: "owner" },
  },
});

const email = values.email?.trim().toLowerCase();
const { password, name, role } = values;
const orgSlug = values["org-slug"]?.trim();
const orgName = values["org-name"]?.trim() || orgSlug;

if (!email || !password || !name || !orgSlug) {
  console.error("Required: --email, --password, --name, --org-slug");
  process.exit(1);
}
if (role !== "owner" && role !== "engineer") {
  console.error('--role must be "owner" or "engineer"');
  process.exit(1);
}

const passwordHash = await hashPassword(password);

await db.transaction(async (tx) => {
  let org = await tx.orm.public.Organization.where({ slug: orgSlug }).first();
  if (!org) {
    org = await tx.orm.public.Organization.create({
      id: randomUUID(),
      name: orgName,
      slug: orgSlug,
      kind: "tenant",
      status: "active",
    });
  }

  let user = await tx.orm.public.User.where({ email }).first();
  if (user) {
    await tx.orm.public.User.where({ id: user.id }).update({ passwordHash, name, status: "active" });
  } else {
    user = await tx.orm.public.User.create({
      id: randomUUID(),
      email,
      passwordHash,
      name,
      status: "active",
    });
  }

  const membership = await tx.orm.public.Membership.where({
    organizationId: org.id,
    userId: user.id,
  }).first();
  if (membership) {
    await tx.orm.public.Membership.where({ id: membership.id }).update({ role, status: "active" });
  } else {
    await tx.orm.public.Membership.create({
      id: randomUUID(),
      organizationId: org.id,
      userId: user.id,
      role,
      status: "active",
    });
  }
});

console.log(`OK: ${email} (${role}) in organization "${orgSlug}"`);
process.exit(0);
