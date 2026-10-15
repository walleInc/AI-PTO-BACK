import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { LeadsRateLimitGuard } from "./leads-rate-limit.guard.js";
import {
  parseContactLeadRequest,
  parseDemoLeadRequest,
} from "./leads.dto.js";
import { LeadsService } from "./leads.service.js";

@Controller("public")
@UseGuards(LeadsRateLimitGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post("demo/lead")
  @HttpCode(201)
  async demoLead(@Body() body: unknown): Promise<{ ok: true }> {
    const parsed = parseDemoLeadRequest(body);
    return this.leadsService.submitDemoLead(parsed);
  }

  @Post("contact")
  @HttpCode(201)
  async contact(@Body() body: unknown): Promise<{ ok: true }> {
    const parsed = parseContactLeadRequest(body);
    return this.leadsService.submitContactLead(parsed);
  }
}
