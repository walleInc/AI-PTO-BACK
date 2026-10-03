import { Module } from "@nestjs/common";
import { FindingsService } from "./findings.service.js";
import { FindingsController } from "./findings.controller.js";

@Module({
  controllers: [FindingsController],
  providers: [FindingsService],
})
export class FindingsModule {}
