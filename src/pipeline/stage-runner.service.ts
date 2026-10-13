import { Inject, Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Stage, StageStatus } from "../common/dto/openapi.types.js";
import { DB, type AppDb } from "../prisma/db.token.js";
import {
  MAX_STAGE_ATTEMPTS,
  PIPELINE_STAGE_ORDER,
  STUB_INPUT_VERSION,
  STUB_OUTPUT_VERSION,
} from "../queue/queue.constants.js";
import { DocumentQueueService } from "../queue/document-queue.service.js";
import { PackageProgressService } from "./package-progress.service.js";

function nextStage(stage: Stage): Stage | null {
  const index = PIPELINE_STAGE_ORDER.indexOf(stage);
  if (index < 0 || index >= PIPELINE_STAGE_ORDER.length - 1) {
    return null;
  }
  return PIPELINE_STAGE_ORDER[index + 1];
}

/** Stub outcome: OCR is skipped (no OCR worker yet); other stages succeed without reading the file. */
function stubOutcome(stage: Stage): StageStatus {
  return stage === "ocr" ? "skipped" : "succeeded";
}

@Injectable()
export class StageRunnerService {
  private readonly logger = new Logger(StageRunnerService.name);
  private readonly workerId = process.env.WORKER_ID?.trim() || `worker-${process.pid}`;

  constructor(
    @Inject(DB) private readonly db: AppDb,
    private readonly queue: DocumentQueueService,
    private readonly packageProgress: PackageProgressService,
  ) {}

  async processStage(stage: Stage, documentId: string, packageId: string): Promise<void> {
    const document = await this.db.orm.public.Document.where({ id: documentId }).first();
    if (!document || document.packageId !== packageId) {
      this.logger.warn(`Document ${documentId} not found in package ${packageId}, skipping`);
      return;
    }

    const existingRuns = await this.db.orm.public.DocumentStageRun.where({ documentId, stage })
      .orderBy((r) => r.attempt.desc())
      .all();

    const latest = existingRuns[0] ?? null;
    if (latest && (latest.status === "succeeded" || latest.status === "skipped")) {
      this.logger.debug(`Stage ${stage} already terminal for ${documentId}, chaining next`);
      await this.advance(stage, documentId, packageId);
      return;
    }

    if (latest && latest.status === "failed" && latest.attempt >= MAX_STAGE_ATTEMPTS) {
      await this.failDocument(documentId, packageId);
      return;
    }

    const attempt = latest ? latest.attempt + (latest.status === "failed" ? 1 : 0) : 1;
    const now = new Date().toISOString();
    const outcome = stubOutcome(stage);

    let runId: string;
    if (latest && latest.status === "running") {
      runId = latest.id;
      await this.db.orm.public.DocumentStageRun.where({ id: runId }).update({
        workerId: this.workerId,
        startedAt: latest.startedAt ?? now,
        inputVersion: STUB_INPUT_VERSION,
      });
    } else if (latest && latest.status === "pending") {
      runId = latest.id;
      await this.db.orm.public.DocumentStageRun.where({ id: runId }).update({
        status: "running",
        workerId: this.workerId,
        startedAt: now,
        inputVersion: STUB_INPUT_VERSION,
      });
    } else {
      runId = randomUUID();
      await this.db.orm.public.DocumentStageRun.create({
        id: runId,
        documentId,
        stage,
        status: "running",
        attempt: latest && latest.status === "failed" ? attempt : 1,
        startedAt: now,
        finishedAt: null,
        errorCode: null,
        errorMessage: null,
        workerId: this.workerId,
        inputVersion: STUB_INPUT_VERSION,
        outputVersion: null,
      });
    }

    if (document.status === "queued") {
      await this.db.orm.public.Document.where({ id: documentId }).update({
        status: "processing",
      });
    }
    await this.packageProgress.markPackageProcessing(packageId);

    const finishedAt = new Date().toISOString();
    await this.db.orm.public.DocumentStageRun.where({ id: runId }).update({
      status: outcome,
      finishedAt,
      outputVersion: STUB_OUTPUT_VERSION,
      errorCode: null,
      errorMessage: null,
    });

    this.logger.log(`Document ${documentId} stage ${stage} → ${outcome}`);
    await this.advance(stage, documentId, packageId);
  }

  private async advance(stage: Stage, documentId: string, packageId: string): Promise<void> {
    const following = nextStage(stage);
    if (following) {
      await this.queue.enqueueStage(following, documentId, packageId);
      await this.packageProgress.refreshPackageStatus(packageId);
      return;
    }

    await this.db.orm.public.Document.where({ id: documentId }).update({
      status: "done",
    });
    await this.packageProgress.refreshPackageStatus(packageId);
  }

  private async failDocument(documentId: string, packageId: string): Promise<void> {
    await this.db.orm.public.Document.where({ id: documentId }).update({
      status: "failed",
    });
    await this.packageProgress.refreshPackageStatus(packageId);
  }
}
