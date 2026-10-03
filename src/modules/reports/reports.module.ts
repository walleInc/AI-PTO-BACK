import { Module } from "@nestjs/common";
import { ReportsService } from "./reports.service.js";
import { ReportsController } from "./reports.controller.js";

@Module({
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
