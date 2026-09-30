import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import type { ProtectedResponse, User } from "../../common/dto/openapi.types";
import { SessionGuard } from "./session.guard";

@Controller("protected")
export class ProtectedController {
  @Get()
  @UseGuards(SessionGuard)
  getProtected(@Req() req: Request & { user: User }): ProtectedResponse {
    return { ok: true, user: req.user };
  }
}
