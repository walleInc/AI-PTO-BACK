import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import type { Report } from "../../common/dto/openapi.types.js";
import { ReportsService } from "./reports.service.js";

@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("objects/:objectId/reports")
  listReports(@Param("objectId", ParseUUIDPipe) objectId: string): Promise<Report[]> {
    return this.reportsService.listReports(objectId);
  }

  @Get("reports/:reportId")
  getReport(@Param("reportId", ParseUUIDPipe) reportId: string): Promise<Report> {
    return this.reportsService.getReport(reportId);
  }

  @Get("reports/:reportId/download")
  downloadReport(@Param("reportId", ParseUUIDPipe) reportId: string): Promise<Buffer> {
    return this.reportsService.downloadReport(reportId);
  }
}
