import { Inject, Injectable } from "@nestjs/common";
import type { Numeric } from "@prisma/orm-postgres/target/codec-types";
import type { DocumentStatus, PackageStatus } from "../common/dto/openapi.types.js";
import { DB, type AppDb } from "../prisma/db.token.js";
import { PIPELINE_STAGE_ORDER } from "../queue/queue.constants.js";

function asProgress(value: number): Numeric<5, 2> {
  return String(Math.round(value * 100) / 100) as unknown as Numeric<5, 2>;
}

const TERMINAL_DOC: ReadonlySet<DocumentStatus> = new Set(["done", "failed", "needs_ocr"]);

@Injectable()
export class PackageProgressService {
  constructor(@Inject(DB) private readonly db: AppDb) {}

  async markPackageProcessing(packageId: string): Promise<void> {
    const pkg = await this.db.orm.public.Package.where({ id: packageId }).first();
    if (!pkg) {
      return;
    }
    if (pkg.status === "queued" || pkg.status === "uploading") {
      await this.db.orm.public.Package.where({ id: packageId }).update({
        status: "processing",
      });
    }
  }

  async refreshPackageStatus(packageId: string): Promise<void> {
    const pkg = await this.db.orm.public.Package.where({ id: packageId })
      .include("documents", (docs) => docs.include("stageRuns"))
      .first();
    if (!pkg) {
      return;
    }

    const documents = pkg.documents;
    const stageTotal = Math.max(documents.length * PIPELINE_STAGE_ORDER.length, 1);
    let stageDone = 0;

    for (const doc of documents) {
      const best = new Map<string, { status: string; attempt: number }>();
      for (const run of doc.stageRuns ?? []) {
        const current = best.get(run.stage);
        if (!current || run.attempt > current.attempt) {
          best.set(run.stage, { status: run.status, attempt: run.attempt });
        }
      }
      for (const stage of PIPELINE_STAGE_ORDER) {
        const status = best.get(stage)?.status;
        if (status === "succeeded" || status === "skipped" || status === "failed") {
          stageDone += 1;
        }
      }
    }

    const progress = asProgress((stageDone / stageTotal) * 100);

    const statuses = documents.map((d) => d.status as DocumentStatus);
    const allTerminal = statuses.length > 0 && statuses.every((s) => TERMINAL_DOC.has(s));

    let status: PackageStatus = pkg.status;
    let finishedAt: string | null = pkg.finishedAt;

    if (allTerminal) {
      const hasDone = statuses.some((s) => s === "done" || s === "needs_ocr");
      const hasFailed = statuses.some((s) => s === "failed");
      if (hasDone && hasFailed) {
        status = "partial";
      } else if (hasDone) {
        status = statuses.every((s) => s === "done") ? "done" : "partial";
      } else {
        status = "failed";
      }
      finishedAt = new Date().toISOString();
    } else if (status === "queued") {
      status = "processing";
    }

    await this.db.orm.public.Package.where({ id: packageId }).update({
      status,
      progress,
      finishedAt,
    });
  }
}
