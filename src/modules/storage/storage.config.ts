const DEFAULT_REGION = "ru-central1";
const DEFAULT_PRESIGN_EXPIRES_SECONDS = 900;
const DEFAULT_MAX_FILE_BYTES = 104_857_600;

export interface StorageConfig {
  accessKey: string;
  secretKey: string;
  bucket: string;
  endpoint: string;
  region: string;
  presignExpiresSeconds: number;
  maxFileBytes: number;
  forcePathStyle: boolean;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function positiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

export function loadStorageConfig(): StorageConfig {
  const endpoint = requiredEnv("S3_ENDPOINT");
  const isYandex = endpoint.includes("storage.yandexcloud.net");

  return {
    accessKey: requiredEnv("S3_ACCESS_KEY"),
    secretKey: requiredEnv("S3_SECRET_KEY"),
    bucket: requiredEnv("S3_BUCKET"),
    endpoint,
    region: process.env.S3_REGION?.trim() || DEFAULT_REGION,
    presignExpiresSeconds: positiveIntEnv("S3_PRESIGN_EXPIRES_SECONDS", DEFAULT_PRESIGN_EXPIRES_SECONDS),
    maxFileBytes: positiveIntEnv("S3_MAX_FILE_BYTES", DEFAULT_MAX_FILE_BYTES),
    forcePathStyle: !isYandex,
  };
}
