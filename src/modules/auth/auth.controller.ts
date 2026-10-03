import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import type { User } from "../../common/dto/openapi.types.js";
import {
  SESSION_COOKIE_NAME,
  getSessionTtlSeconds,
  sessionCookieOptions,
} from "./auth.constants.js";
import { AuthService } from "./auth.service.js";
import { parseLoginRequest } from "./login.dto.js";
import { SessionGuard } from "./session.guard.js";

function sessionMeta(req: Request) {
  return { userAgent: req.get("user-agent"), ip: req.ip };
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("login")
  async login(@Res() res: Response): Promise<void> {
    this.authService.assertProvider("zitadel");
    const url = await this.authService.startLogin();
    res.redirect(302, url);
  }

  @Post("login")
  @HttpCode(200)
  async loginWithPassword(
    @Req() req: Request,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ): Promise<User> {
    this.authService.assertProvider("local");
    const { email, password } = parseLoginRequest(body);
    const { sessionId, user } = await this.authService.loginWithPassword(
      email,
      password,
      sessionMeta(req),
    );
    res.cookie(SESSION_COOKIE_NAME, sessionId, sessionCookieOptions(getSessionTtlSeconds()));
    return user;
  }

  @Get("callback")
  async callback(
    @Req() req: Request,
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Query("error") error: string | undefined,
    @Query("error_description") errorDescription: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    this.authService.assertProvider("zitadel");
    const { sessionId } = await this.authService.handleCallback(
      { code, state, error, error_description: errorDescription },
      sessionMeta(req),
    );
    res.cookie(SESSION_COOKIE_NAME, sessionId, sessionCookieOptions(getSessionTtlSeconds()));
    res.redirect(302, "/api/auth/me");
  }

  @Get("me")
  @UseGuards(SessionGuard)
  getMe(@Req() req: Request & { user: User }): User {
    return req.user;
  }

  @Post("logout")
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    await this.authService.logout(sessionId);
    res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions());
  }
}
