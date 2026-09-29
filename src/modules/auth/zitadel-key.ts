import { createPrivateKey } from "node:crypto";
import { readFileSync } from "node:fs";
import { exportJWK, type JWK } from "jose";

/** Shape of the JSON key file downloaded from ZITADEL Console (Application → Keys). */
export interface ZitadelAppKeyFile {
  type?: string;
  keyId: string;
  key: string;
  appId?: string;
  clientId?: string;
}

export interface ZitadelPrivateJwks {
  keys: JWK[];
  clientIdFromKey?: string;
  keyId: string;
}

export function parseZitadelAppKeyJson(raw: unknown): ZitadelAppKeyFile {
  if (!raw || typeof raw !== "object") {
    throw new Error("ZITADEL key file must be a JSON object");
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.keyId !== "string" || !obj.keyId) {
    throw new Error("ZITADEL key file missing keyId");
  }
  if (typeof obj.key !== "string" || !obj.key.includes("BEGIN")) {
    throw new Error("ZITADEL key file missing PEM private key");
  }
  return {
    type: typeof obj.type === "string" ? obj.type : undefined,
    keyId: obj.keyId,
    key: obj.key,
    appId: typeof obj.appId === "string" ? obj.appId : undefined,
    clientId: typeof obj.clientId === "string" ? obj.clientId : undefined,
  };
}

export async function zitadelAppKeyToJwks(file: ZitadelAppKeyFile): Promise<ZitadelPrivateJwks> {
  const keyObject = createPrivateKey(file.key);
  const jwk = await exportJWK(keyObject);
  jwk.kid = file.keyId;
  jwk.alg = jwk.alg ?? "RS256";
  jwk.use = "sig";

  return {
    keys: [jwk],
    clientIdFromKey: file.clientId,
    keyId: file.keyId,
  };
}

export async function loadZitadelPrivateJwks(keyPath: string): Promise<ZitadelPrivateJwks> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(keyPath, "utf8")) as unknown;
  } catch (err) {
    throw new Error(
      `Unable to read ZITADEL key at ${keyPath}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  return zitadelAppKeyToJwks(parseZitadelAppKeyJson(parsed));
}
