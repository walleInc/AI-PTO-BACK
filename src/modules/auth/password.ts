import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// Format: scrypt$<N>$<r>$<p>$<saltB64>$<hashB64>. Keep in sync with scripts/create-user.mjs.
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const COST = { N: 16_384, r: 8, p: 1 };

function derive(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, { N: n, r, p }, (err, key) => {
      if (err) {
        reject(err);
      } else {
        resolve(key);
      }
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, COST.N, COST.r, COST.p);
  return ["scrypt", COST.N, COST.r, COST.p, salt.toString("base64"), key.toString("base64")].join(
    "$",
  );
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    return false;
  }
  const [n, r, p] = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
  if (![n, r, p].every((v) => Number.isInteger(v) && v > 0)) {
    return false;
  }
  const expected = Buffer.from(parts[5], "base64");
  if (expected.length === 0) {
    return false;
  }
  try {
    const actual = await derive(password, Buffer.from(parts[4], "base64"), n, r, p);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
