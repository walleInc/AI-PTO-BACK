import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import type { User } from "../../common/dto/openapi.types";
import { SESSION_COOKIE_NAME } from "./auth.constants";
import { SessionService } from "./session.service";

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: User }>();
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    if (!sessionId) {
      throw new UnauthorizedException({
        code: "unauthorized",
        message: "Требуется вход в систему",
      });
    }

    const user = await this.sessions.getSession(sessionId);
    if (!user) {
      throw new UnauthorizedException({
        code: "unauthorized",
        message: "Требуется вход в систему",
      });
    }

    req.user = user;
    return true;
  }
}
