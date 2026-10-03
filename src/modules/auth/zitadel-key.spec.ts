import { generateKeyPairSync } from "node:crypto";
import { parseZitadelAppKeyJson, zitadelAppKeyToJwks } from "./zitadel-key.js";

function samplePem(): string {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return privateKey.export({ type: "pkcs8", format: "pem" }).toString();
}

describe("parseZitadelAppKeyJson", () => {
  it("accepts a valid ZITADEL key JSON shape", () => {
    const pem = samplePem();
    const file = parseZitadelAppKeyJson({
      type: "application",
      keyId: "kid-1",
      key: pem,
      clientId: "client-xyz",
    });
    expect(file.keyId).toBe("kid-1");
    expect(file.clientId).toBe("client-xyz");
    expect(file.key).toContain("BEGIN");
  });

  it("rejects missing keyId", () => {
    expect(() =>
      parseZitadelAppKeyJson({ key: samplePem() }),
    ).toThrow(/keyId/);
  });

  it("rejects missing PEM key", () => {
    expect(() =>
      parseZitadelAppKeyJson({ keyId: "kid-1", key: "not-a-pem" }),
    ).toThrow(/PEM/);
  });
});

describe("zitadelAppKeyToJwks", () => {
  it("exports a private JWK with kid and RS256", async () => {
    const pem = samplePem();
    const jwks = await zitadelAppKeyToJwks({
      keyId: "kid-42",
      key: pem,
      clientId: "app-client",
    });
    expect(jwks.keyId).toBe("kid-42");
    expect(jwks.clientIdFromKey).toBe("app-client");
    expect(jwks.keys).toHaveLength(1);
    expect(jwks.keys[0].kid).toBe("kid-42");
    expect(jwks.keys[0].alg).toBe("RS256");
    expect(jwks.keys[0].kty).toBe("RSA");
    expect(jwks.keys[0].d).toBeDefined();
  });
});
