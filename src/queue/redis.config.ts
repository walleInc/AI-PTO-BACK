import type { ConnectionOptions } from "bullmq";

export function getRedisUrl(): string {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    throw new Error("REDIS_URL is required for BullMQ");
  }
  return url;
}

/** Shared BullMQ connection options. Worker requires maxRetriesPerRequest: null. */
export function getBullmqConnection(): ConnectionOptions {
  return {
    url: getRedisUrl(),
    maxRetriesPerRequest: null,
  };
}
