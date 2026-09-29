import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import type { Checklist, ObjectSummary } from "../../common/dto/openapi.types";
import { ChecklistService } from "./checklist.service";

@Controller()
export class ChecklistController {
  constructor(private readonly checklistService: ChecklistService) {}

  @Get("objects/:objectId/summary")
  getObjectSummary(@Param("objectId", ParseUUIDPipe) objectId: string): Promise<ObjectSummary> {
    return this.checklistService.getObjectSummary(objectId);
  }

  @Get("objects/:objectId/checklist")
  getChecklist(@Param("objectId", ParseUUIDPipe) objectId: string): Promise<Checklist> {
    return this.checklistService.getChecklist(objectId);
  }
}
