import { Module } from "@nestjs/common";
import { QueueModule } from "../queue/queue.module.js";
import { PackageProgressService } from "./package-progress.service.js";
import { PipelineWorkers } from "./pipeline.workers.js";
import { StageRunnerService } from "./stage-runner.service.js";

@Module({
  imports: [QueueModule],
  providers: [StageRunnerService, PackageProgressService],
  exports: [StageRunnerService, PackageProgressService],
})
export class PipelineModule {}

/** Worker-only module: registers BullMQ consumers. */
@Module({
  imports: [PipelineModule],
  providers: [PipelineWorkers],
})
export class PipelineWorkerModule {}
