import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { OidcService } from "./oidc.service.js";
import { ProtectedController } from "./protected.controller.js";
import { SessionGuard } from "./session.guard.js";
import { SessionService } from "./session.service.js";

@Module({
  controllers: [AuthController, ProtectedController],
  providers: [AuthService, OidcService, SessionService, SessionGuard],
  exports: [SessionGuard, SessionService],
})
export class AuthModule {}
