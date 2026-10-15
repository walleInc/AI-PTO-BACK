import { Module } from "@nestjs/common";
import { LeadsController } from "./leads.controller.js";
import { LeadsRateLimitGuard } from "./leads-rate-limit.guard.js";
import { LeadsService } from "./leads.service.js";
import { MailService } from "./mail.service.js";

@Module({
  controllers: [LeadsController],
  providers: [LeadsService, MailService, LeadsRateLimitGuard],
})
export class LeadsModule {}
