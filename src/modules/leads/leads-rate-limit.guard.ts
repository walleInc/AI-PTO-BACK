import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";

/** ~5 req/min per IP for public lead endpoints. */
const WINDOW_MS = 60_000;
const MAX_HITS = 5;

type Bucket = { count: number; resetAt: number };

@Injectable()
export class LeadsRateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const current = this.buckets.get(ip);

    if (!current || current.resetAt <= now) {
      this.buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
      return true;
    }

    if (current.count >= MAX_HITS) {
      throw new HttpException(
        {
          code: "rate_limited",
          message: "Слишком много запросов, попробуйте позже",
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    current.count += 1;
    return true;
  }
}
