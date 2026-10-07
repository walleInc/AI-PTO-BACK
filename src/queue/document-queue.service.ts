import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import type { Stage } from "../common/dto/openapi.types.js";
import { DocumentStageJobData, PIPELINE_STAGE_ORDER, QUEUE_NAMES } from "./queue.constants.js";
import { getBullmqConnection } from "./redis.config.js";

@Injectable()
export class DocumentQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(DocumentQueueService.name);
  private readonly queues = new Map<Stage, Queue<DocumentStageJobData>>();

  private queueFor(stage: Stage): Queue<DocumentStageJobData> {
    let queue = this.queues.get(stage);
    if (!queue) {
      queue = new Queue<DocumentStageJobData>(QUEUE_NAMES[stage], {
        connection: getBullmqConnection(),
        defaultJobOptions: {
          removeOnComplete: 1000,
          removeOnFail: 5000,
          attempts: 1,
        },
      });
      this.queues.set(stage, queue);
    }
    return queue;
  }

  async enqueueStage(stage: Stage, documentId: string, packageId: string): Promise<void> {
    // BullMQ rejects custom ids that contain ':'.
    const jobId = `${stage}_${documentId}`;
    const queue = this.queueFor(stage);
    const existing = await queue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === "completed" || state === "failed") {
        await existing.remove();
      } else {
        this.logger.debug(`Job ${jobId} already ${state}, skip enqueue`);
        return;
      }
    }

    await queue.add(stage, { documentId, packageId, stage }, { jobId });
    this.logger.debug(`Enqueued ${jobId}`);
  }

  async enqueueDocumentPipeline(documentId: string, packageId: string): Promise<void> {
    await this.enqueueStage(PIPELINE_STAGE_ORDER[0], documentId, packageId);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
    this.queues.clear();
  }
}
