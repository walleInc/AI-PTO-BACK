/** Types mirrored from docs/openapi.yaml — request/response contracts for Nest stubs. */

export type Severity = "error" | "warning" | "info" | "critical";
export type FindingStatus = "open" | "accepted" | "dismissed" | "fixed";
export type DocumentType =
  | "aosr"
  | "general_work_log"
  | "concrete_log"
  | "welding_log"
  | "material_passport"
  | "as_built_scheme"
  | "test_report"
  | "other"
  | "unknown";
export type DocumentStatus = "awaiting_upload" | "uploaded" | "queued" | "processing" | "done" | "failed" | "needs_ocr";
export type Stage = "extract" | "ocr" | "classify" | "parse" | "rules" | "explain";
export type StageStatus = "pending" | "running" | "succeeded" | "failed" | "skipped";
export type PackageStatus = "uploading" | "queued" | "processing" | "done" | "partial" | "failed";
export type ChecklistStatus = "missing" | "partial" | "complete";
export type ReportStatus = "queued" | "generating" | "ready" | "failed";
export type ReportScope = "accepted" | "errors" | "all_open";
export type UserRole = "owner" | "engineer";
export type ObjectStatus = "draft" | "active" | "on_hold" | "completed" | "archived";

export interface ApiError {
  code: string;
  message: string;
  details?: Array<{ field?: string; message?: string }>;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface SeverityCounts {
  error: number;
  warning: number;
  info: number;
  critical: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  role: UserRole;
}

/** Alias for stage-1 OpenAPI `Me`. */
export type Me = User;

export type EmployeeStatus = "active";

export interface Employee {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  role: "engineer";
  status: EmployeeStatus;
}

export interface EmployeeCreate {
  email: string;
  name: string;
  password: string;
}

export interface EmployeeUpdate {
  email?: string;
  name?: string;
  password?: string;
}

export interface ProtectedResponse {
  ok: boolean;
  user: User;
}

export interface ObjectGroupRef {
  id: string;
  code: string;
  name: string;
}

export interface ObjectType {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  group: ObjectGroupRef;
}

export interface WorkType {
  id: string;
  code: string;
  name: string;
  description?: string | null;
}

export interface Counterparty {
  id: string;
  name: string;
  slug: string;
}

export interface ObjectWrite {
  code: string;
  name: string;
  objectTypeId: string;
  workTypeIds: string[];
  address?: string | null;
  customerOrganizationId?: string | null;
  contractorOrganizationId?: string | null;
  /** Ignored on this stage — requirement profiles are not implemented yet. */
  customerProfileId?: string | null;
  description?: string | null;
}

export interface ObjectStatusChange {
  status: Exclude<ObjectStatus, "archived">;
}

export interface OrganizationRef {
  id: string;
  name: string;
}

export interface ConstructionObject {
  id: string;
  code: string;
  name: string;
  address: string | null;
  status: ObjectStatus;
  description: string | null;
  objectType: ObjectType;
  customer: OrganizationRef | null;
  contractor: OrganizationRef | null;
  workTypes: WorkType[];
  startDate: string | null;
  plannedEndDate: string | null;
  actualEndDate: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface PackageCreateFile {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256?: string;
}

export interface PackageCreate {
  files: PackageCreateFile[];
}

export interface Package {
  id: string;
  objectId: string;
  version: number;
  status: PackageStatus;
  progress?: number;
  createdAt: string;
}

export interface PackageCreated {
  package: Package;
  uploads: Array<{
    documentId: string;
    fileName: string;
    uploadUrl: string;
    expiresAt: string;
    duplicateOf?: string | null;
  }>;
}

export interface StageError {
  code: string;
  message: string;
}

export interface StageState {
  status: StageStatus;
  error?: StageError;
  finishedAt?: string | null;
}

export interface Document {
  id: string;
  objectId: string;
  packageId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  pageCount?: number | null;
  type: DocumentType;
  typeConfidence?: number | null;
  typeEditedManually?: boolean;
  status: DocumentStatus;
  stages: Partial<Record<Stage, StageState>>;
  findings: SeverityCounts;
  createdAt: string;
}

export interface PackageDetail extends Package {
  documents: Document[];
}

export interface ExtractedField {
  key: string;
  value: string | null;
  confidence?: number | null;
  editedManually?: boolean;
  originalValue?: string | null;
}

export interface DocumentDetail extends Document {
  fields: ExtractedField[];
  lowConfidenceThreshold?: number;
}

export interface DocumentUpdate {
  type: DocumentType;
}

export interface DocumentFieldsUpdate {
  fields: Array<{ key: string; value: string | null }>;
}

export interface DocumentRecheckRequest {
  fromStage?: Stage;
}

export interface Finding {
  id: string;
  objectId: string;
  packageId: string;
  documentId: string;
  ruleId: string;
  ruleVersion: string;
  title: string;
  message: string;
  severity: Severity;
  confidence?: number | null;
  status: FindingStatus;
  comment?: string | null;
  decidedBy?: string | null;
  decidedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FindingUpdate {
  status?: FindingStatus;
  comment?: string;
}

export interface FindingBulkUpdate {
  ids: string[];
  status: FindingStatus;
  comment?: string;
}

export interface FindingHistoryEntry {
  at: string;
  userId: string;
  fromStatus: FindingStatus;
  toStatus: FindingStatus;
  comment?: string | null;
}

export interface ChecklistItem {
  documentType: DocumentType;
  title: string;
  required: number;
  found: number;
  status: ChecklistStatus;
  documentIds: string[];
}

export interface Checklist {
  readiness: number;
  items: ChecklistItem[];
}

export interface ObjectSummary {
  readiness: number;
  findings: SeverityCounts;
  pendingDecisions: number;
  byDocumentType: Array<{ documentType: DocumentType; counts: SeverityCounts }>;
  topRules: Array<{ ruleId: string; title: string; count: number }>;
  history?: Array<{
    packageId: string;
    version: number;
    findings: SeverityCounts;
  }>;
}

export interface ReportCreate {
  scope?: ReportScope;
  recipient?: string;
}

export interface Report {
  id: string;
  objectId: string;
  packageId: string;
  status: ReportStatus;
  scope: ReportScope;
  recipient?: string | null;
  findingsCount?: number;
  error?: StageError;
  createdBy: string;
  createdAt: string;
  readyAt?: string | null;
}

export interface PageQuery {
  page?: number;
  pageSize?: number;
}

export interface ListObjectsQuery extends PageQuery {
  q?: string;
  sort?: string;
  includeArchived?: boolean | string;
}

export interface ListDocumentsQuery extends PageQuery {
  packageId?: string;
  type?: DocumentType;
  status?: DocumentStatus;
  sort?: string;
}

export interface ListFindingsQuery extends PageQuery {
  severity?: Severity[];
  status?: FindingStatus[];
  documentId?: string;
  documentType?: DocumentType;
  ruleId?: string;
  sort?: string;
}
