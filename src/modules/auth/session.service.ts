import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { randomUUID } from "node:crypto";
import type { User } from "../../common/dto/openapi.types";
import { getSessionTtlSeconds, OIDC_STATE_TTL_SECONDS } from "./auth.constants";

export interface OidcPendingState {
  codeVerifier: string;
  createdAt: number;
}

@Injectable()
export class SessionService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor() {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    this.redis = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: false });
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  async saveOidcState(state: string, payload: OidcPendingState): Promise<void> {
    await this.redis.set(`oidc:state:${state}`, JSON.stringify(payload), "EX", OIDC_STATE_TTL_SECONDS);
  }

  async takeOidcState(state: string): Promise<OidcPendingState | null> {
    const key = `oidc:state:${state}`;
    const raw = await this.redis.get(key);
    if (!raw) {
      return null;
    }
    await this.redis.del(key);
    return JSON.parse(raw) as OidcPendingState;
  }

  async createSession(user: User): Promise<string> {
    const sessionId = randomUUID();
    const ttl = getSessionTtlSeconds();
    await this.redis.set(`session:${sessionId}`, JSON.stringify(user), "EX", ttl);
    return sessionId;
  }

  async getSession(sessionId: string): Promise<User | null> {
    const raw = await this.redis.get(`session:${sessionId}`);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as User;
    return {
      ...parsed,
      organizationName: parsed.organizationName ?? "",
    };
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.redis.del(`session:${sessionId}`);
  }
}
