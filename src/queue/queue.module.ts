import { Global, Module } from "@nestjs/common";
import { DocumentQueueService } from "./document-queue.service.js";

@Global()
@Module({
  providers: [DocumentQueueService],
  exports: [DocumentQueueService],
})
export class QueueModule {}
