import { Module } from "@nestjs/common";
import { ChecklistService } from "./checklist.service.js";
import { ChecklistController } from "./checklist.controller.js";

@Module({
  controllers: [ChecklistController],
  providers: [ChecklistService],
})
export class ChecklistModule {}
