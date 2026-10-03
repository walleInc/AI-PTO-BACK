import { hashPassword, verifyPassword } from "./password.js";

describe("password hashing", () => {
  it("verifies the correct password and rejects a wrong one", async () => {
    const hash = await hashPassword("s3cret-пароль");
    expect(hash.startsWith("scrypt$")).toBe(true);
    await expect(verifyPassword("s3cret-пароль", hash)).resolves.toBe(true);
    await expect(verifyPassword("other", hash)).resolves.toBe(false);
  });

  it("uses a random salt", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("rejects malformed stored hashes", async () => {
    await expect(verifyPassword("x", "")).resolves.toBe(false);
    await expect(verifyPassword("x", "bcrypt$1$2$3$4$5")).resolves.toBe(false);
    await expect(verifyPassword("x", "scrypt$a$b$c$d$e")).resolves.toBe(false);
  });
});
