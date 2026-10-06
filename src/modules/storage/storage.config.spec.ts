import { loadStorageConfig } from "./storage.config.js";

describe("loadStorageConfig", () => {
  const OLD = { ...process.env };

  afterEach(() => {
    process.env = { ...OLD };
  });

  it("loads yandex defaults without forcePathStyle", () => {
    process.env.S3_ACCESS_KEY = "ak";
    process.env.S3_SECRET_KEY = "sk";
    process.env.S3_BUCKET = "bucket";
    process.env.S3_ENDPOINT = "https://storage.yandexcloud.net";
    delete process.env.S3_REGION;
    delete process.env.S3_PRESIGN_EXPIRES_SECONDS;
    delete process.env.S3_MAX_FILE_BYTES;

    const cfg = loadStorageConfig();
    expect(cfg.region).toBe("ru-central1");
    expect(cfg.forcePathStyle).toBe(false);
    expect(cfg.maxFileBytes).toBe(104_857_600);
    expect(cfg.presignExpiresSeconds).toBe(900);
  });

  it("enables forcePathStyle for non-yandex endpoints", () => {
    process.env.S3_ACCESS_KEY = "ak";
    process.env.S3_SECRET_KEY = "sk";
    process.env.S3_BUCKET = "bucket";
    process.env.S3_ENDPOINT = "http://localhost:9000";

    expect(loadStorageConfig().forcePathStyle).toBe(true);
  });
});
