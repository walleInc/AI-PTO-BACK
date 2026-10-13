import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Worker, type Job } from "bullmq";
import type { Stage } from "../common/dto/openapi.types.js";
import { DocumentStageJobData, PIPELINE_STAGE_ORDER, QUEUE_NAMES } from "../queue/queue.constants.js";
import { getBullmqConnection } from "../queue/redis.config.js";
import { StageRunnerService } from "./stage-runner.service.js";

@Injectable()
export class PipelineWorkers implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PipelineWorkers.name);
  private readonly workers: Worker<DocumentStageJobData>[] = [];

  constructor(private readonly stageRunner: StageRunnerService) {}

  onModuleInit(): void {
    for (const stage of PIPELINE_STAGE_ORDER) {
      const worker = new Worker<DocumentStageJobData>(
        QUEUE_NAMES[stage],
        async (job: Job<DocumentStageJobData>) => {
          await this.handleJob(stage, job);
        },
        {
          connection: getBullmqConnection(),
          concurrency: Number(process.env.WORKER_CONCURRENCY ?? 4),
        },
      );

      worker.on("failed", (job, error) => {
        this.logger.error(`Job ${job?.id ?? "?"} (${stage}) failed: ${error.message}`, error.stack);
      });

      this.workers.push(worker);
      this.logger.log(`Listening on queue ${QUEUE_NAMES[stage]}`);
    }
  }

  private async handleJob(expectedStage: Stage, job: Job<DocumentStageJobData>): Promise<void> {
    const { documentId, packageId, stage } = job.data;
    if (stage !== expectedStage) {
      this.logger.warn(`Job stage mismatch: expected ${expectedStage}, got ${stage}`);
    }
    await this.stageRunner.processStage(stage ?? expectedStage, documentId, packageId);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.workers.map((worker) => worker.close()));
    this.workers.length = 0;
  }
}
