import { Module } from "@nestjs/common";
import { DocumentsService } from "./documents.service.js";
import { DocumentsController } from "./documents.controller.js";

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
