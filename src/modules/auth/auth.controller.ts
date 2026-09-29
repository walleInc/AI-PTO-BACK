import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import type { AuthResponse, LoginRequest, User } from "../../common/dto/openapi.types";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(200)
  login(@Body() body: LoginRequest): Promise<AuthResponse> {
    return this.authService.login(body);
  }

  @Post("logout")
  @HttpCode(204)
  logout(): Promise<void> {
    return this.authService.logout();
  }

  @Get("me")
  getMe(): Promise<User> {
    return this.authService.getMe();
  }
}
