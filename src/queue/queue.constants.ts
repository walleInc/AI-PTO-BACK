import type { Stage } from "../common/dto/openapi.types.js";

export const PIPELINE_STAGE_ORDER: readonly Stage[] = [
  "extract",
  "ocr",
  "classify",
  "parse",
  "rules",
  "explain",
] as const;

export const QUEUE_NAMES = {
  extract: "document-extract",
  ocr: "document-ocr",
  classify: "document-classify",
  parse: "document-parse",
  rules: "document-rules",
  explain: "document-explain",
} as const satisfies Record<Stage, string>;

export type DocumentStageJobData = {
  documentId: string;
  packageId: string;
  stage: Stage;
};

export const STUB_INPUT_VERSION = "stub-v1";
export const STUB_OUTPUT_VERSION = "stub-v1";

export const MAX_STAGE_ATTEMPTS = 3;
