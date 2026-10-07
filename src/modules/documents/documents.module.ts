import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { StorageModule } from "../storage/storage.module.js";
import { DocumentsController } from "./documents.controller.js";
import { DocumentsService } from "./documents.service.js";

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
