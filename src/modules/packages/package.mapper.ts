import type {
  Document,
  DocumentType,
  Package,
  PackageStatus,
  SeverityCounts,
  Stage,
  StageState,
  StageStatus,
} from "../../common/dto/openapi.types.js";

export const ZERO_FINDINGS: SeverityCounts = {
  error: 0,
  warning: 0,
  info: 0,
  critical: 0,
};

export const PIPELINE_STAGES: Stage[] = ["extract", "ocr", "classify", "parse", "rules", "explain"];

const DOCUMENT_TYPES = new Set<DocumentType>([
  "aosr",
  "general_work_log",
  "concrete_log",
  "welding_log",
  "material_passport",
  "as_built_scheme",
  "test_report",
  "other",
  "unknown",
]);

export function emptyStages(): Record<Stage, StageState> {
  return {
    extract: { status: "pending", finishedAt: null },
    ocr: { status: "pending", finishedAt: null },
    classify: { status: "pending", finishedAt: null },
    parse: { status: "pending", finishedAt: null },
    rules: { status: "pending", finishedAt: null },
    explain: { status: "pending", finishedAt: null },
  };
}

export function toPackageDto(row: {
  id: string;
  objectId: string;
  version: number;
  status: PackageStatus;
  progress: unknown;
  documentsCount: number;
  createdAt: string;
  finishedAt: string | null;
}): Package {
  return {
    id: row.id,
    objectId: row.objectId,
    version: row.version,
    status: row.status,
    progress: Number(row.progress ?? 0),
    documentsCount: row.documentsCount,
    findings: ZERO_FINDINGS,
    createdAt: row.createdAt,
    finishedAt: row.finishedAt,
  };
}

export function toDocumentTypeCode(code: string | null | undefined): DocumentType {
  if (code && DOCUMENT_TYPES.has(code as DocumentType)) {
    return code as DocumentType;
  }
  return "unknown";
}

export function mapStages(
  stageRuns: Array<{
    stage: Stage;
    status: StageStatus;
    errorCode: string | null;
    errorMessage: string | null;
    finishedAt: string | null;
    attempt: number;
  }>,
): Record<Stage, StageState> {
  const stages = emptyStages();
  const best = new Map<Stage, (typeof stageRuns)[number]>();

  for (const run of stageRuns) {
    const current = best.get(run.stage);
    if (!current || run.attempt > current.attempt) {
      best.set(run.stage, run);
    }
  }

  for (const [stage, run] of best) {
    stages[stage] = {
      status: run.status,
      finishedAt: run.finishedAt,
      ...(run.errorCode || run.errorMessage
        ? {
            error: {
              code: run.errorCode ?? "stage_error",
              message: run.errorMessage ?? "Ошибка этапа",
            },
          }
        : {}),
    };
  }

  return stages;
}

export function toDocumentDto(row: {
  id: string;
  objectId: string;
  packageId: string;
  fileName: string;
  mimeType: string;
  status: Document["status"];
  typeConfidence: unknown;
  typeEditedManually: boolean;
  createdAt: string;
  fileAsset?: { sizeBytes: unknown } | null;
  documentType?: { code: string } | null;
  stageRuns?: Array<{
    stage: Stage;
    status: StageStatus;
    errorCode: string | null;
    errorMessage: string | null;
    finishedAt: string | null;
    attempt: number;
  }>;
}): Document {
  return {
    id: row.id,
    objectId: row.objectId,
    packageId: row.packageId,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: Number(row.fileAsset?.sizeBytes ?? 0),
    type: toDocumentTypeCode(row.documentType?.code),
    typeConfidence: row.typeConfidence === null || row.typeConfidence === undefined ? null : Number(row.typeConfidence),
    typeEditedManually: row.typeEditedManually,
    status: row.status,
    stages: mapStages(row.stageRuns ?? []),
    findings: ZERO_FINDINGS,
    createdAt: row.createdAt,
  };
}

export function sanitizeFileName(fileName: string): string {
  const base = fileName.replace(/[/\\]/g, "_").trim();
  return base.length > 0 ? base.slice(0, 200) : "file";
}
