import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module.js";
import { PipelineWorkerModule } from "./pipeline/pipeline.module.js";
import { QueueModule } from "./queue/queue.module.js";

@Module({
  imports: [PrismaModule, QueueModule, PipelineWorkerModule],
})
export class WorkerModule {}
