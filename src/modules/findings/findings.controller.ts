import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import type {
  Finding,
  FindingBulkUpdate,
  FindingHistoryEntry,
  FindingUpdate,
  ListFindingsQuery,
  PageMeta,
  SeverityCounts,
} from "../../common/dto/openapi.types.js";
import { FindingsService } from "./findings.service.js";

@Controller()
export class FindingsController {
  constructor(private readonly findingsService: FindingsService) {}

  @Get("objects/:objectId/findings")
  listFindings(
    @Param("objectId", ParseUUIDPipe) objectId: string,
    @Query() query: ListFindingsQuery,
  ): Promise<{
    items: Finding[];
    meta: PageMeta;
    aggregates?: {
      bySeverity: SeverityCounts;
      byStatus: Record<string, number>;
    };
  }> {
    return this.findingsService.listFindings(objectId, query);
  }

  @Post("findings/bulk")
  bulkUpdateFindings(@Body() body: FindingBulkUpdate): Promise<{ updated: number }> {
    return this.findingsService.bulkUpdateFindings(body);
  }

  @Get("findings/:findingId")
  getFinding(@Param("findingId", ParseUUIDPipe) findingId: string): Promise<Finding> {
    return this.findingsService.getFinding(findingId);
  }

  @Patch("findings/:findingId")
  updateFinding(@Param("findingId", ParseUUIDPipe) findingId: string, @Body() body: FindingUpdate): Promise<Finding> {
    return this.findingsService.updateFinding(findingId, body);
  }

  @Get("findings/:findingId/history")
  getFindingHistory(@Param("findingId", ParseUUIDPipe) findingId: string): Promise<FindingHistoryEntry[]> {
    return this.findingsService.getFindingHistory(findingId);
  }
}
