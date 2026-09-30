import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { OidcService } from "./oidc.service";
import { ProtectedController } from "./protected.controller";
import { SessionGuard } from "./session.guard";
import { SessionService } from "./session.service";

@Module({
  controllers: [AuthController, ProtectedController],
  providers: [AuthService, OidcService, SessionService, SessionGuard],
  exports: [SessionGuard, SessionService],
})
export class AuthModule {}
