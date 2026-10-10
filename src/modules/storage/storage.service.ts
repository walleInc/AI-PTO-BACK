import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { loadStorageConfig, type StorageConfig } from "./storage.config.js";

export interface PresignedUpload {
  url: string;
  headers: Record<string, string>;
  expiresAt: string;
}

export interface PresignedDownload {
  url: string;
  expiresAt: string;
}

@Injectable()
export class StorageService implements OnModuleDestroy {
  private readonly config: StorageConfig;
  private readonly client: S3Client;

  constructor() {
    this.config = loadStorageConfig();
    this.client = new S3Client({
      region: this.config.region,
      endpoint: this.config.endpoint,
      forcePathStyle: this.config.forcePathStyle,
      credentials: {
        accessKeyId: this.config.accessKey,
        secretAccessKey: this.config.secretKey,
      },
    });
  }

  get bucket(): string {
    return this.config.bucket;
  }

  get maxFileBytes(): number {
    return this.config.maxFileBytes;
  }

  get storageProvider(): string {
    return this.config.endpoint.includes("storage.yandexcloud.net") ? "yandex" : "s3";
  }

  async presignPut(objectKey: string, contentType: string): Promise<PresignedUpload> {
    const expiresIn = this.config.presignExpiresSeconds;
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: objectKey,
      ContentType: contentType,
    });
    const url = await getSignedUrl(this.client, command, { expiresIn });
    return {
      url,
      headers: { "Content-Type": contentType },
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    };
  }

  async presignGet(objectKey: string): Promise<PresignedDownload> {
    const expiresIn = this.config.presignExpiresSeconds;
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: objectKey,
    });
    const url = await getSignedUrl(this.client, command, { expiresIn });
    return {
      url,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    };
  }

  async objectExists(objectKey: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: objectKey,
        }),
      );
      return true;
    } catch (error) {
      if (isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  async deleteObject(objectKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: objectKey,
      }),
    );
  }

  onModuleDestroy(): void {
    this.client.destroy();
  }
}

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return err.name === "NotFound" || err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404;
}
