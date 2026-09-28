#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/eb708c08fb89d52bdcdb299e39f561f04defc01139117bcda513e94f373e51eb/contract';
import endContract from '../../snapshots/eb708c08fb89d52bdcdb299e39f561f04defc01139117bcda513e94f373e51eb/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'auditLog',
        columns: [
          col('action', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('actorId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('entityId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('entityType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('organizationId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('payload', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'checklist',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('objectId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('packageId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('readiness', 'numeric(5,2)', {
            notNull: true,
            default: fn("'0'::numeric(5,2)"),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 5, scale: 2 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'checklistItem',
        columns: [
          col('checklistId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('foundCount', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('requiredCount', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('requirementItemId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'checklistItem_status_check_091329ae',
            "\"status\" IN ('missing', 'partial', 'complete')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'checklistItemDocument',
        columns: [
          col('checklistItemId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('documentId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['checklistItemId', 'documentId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'constructionObject',
        columns: [
          col('actualEndDate', 'date', { codecRef: { codecId: 'pg/date-string@1' } }),
          col('address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('archivedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('contractorOrganizationId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('createdById', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('customerOrganizationId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('customerProfileId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('objectTypeId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('organizationId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('plannedEndDate', 'date', { codecRef: { codecId: 'pg/date-string@1' } }),
          col('startDate', 'date', { codecRef: { codecId: 'pg/date-string@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('draft'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'constructionObject_status_check_6f2ec66d',
            "\"status\" IN ('draft', 'active', 'on_hold', 'completed', 'archived')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'customerRequirementProfile',
        columns: [
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('draft'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('version', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'customerRequirementProfile_status_check_4757a2da',
            "\"status\" IN ('draft', 'active', 'retired')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'document',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('documentTypeId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('fileAssetId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('fileName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('mimeType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('objectId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('packageId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('awaiting_upload'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('typeConfidence', 'numeric(5,4)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 5, scale: 4 } },
          }),
          col('typeEditedManually', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'document_status_check_d5a4650a',
            "\"status\" IN ('awaiting_upload', 'uploaded', 'queued', 'processing', 'done', 'failed')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'documentStageRun',
        columns: [
          col('attempt', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('documentId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('errorCode', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('errorMessage', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('finishedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('inputVersion', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('outputVersion', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('stage', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('startedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('pending'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('workerId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'documentStageRun_stage_check_077a8ad5',
            "\"stage\" IN ('extract', 'ocr', 'classify', 'parse', 'rules', 'explain')",
          ),
          checkExpression(
            'documentStageRun_status_check_f3d81e4d',
            "\"status\" IN ('pending', 'running', 'succeeded', 'failed', 'skipped')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'documentType',
        columns: [
          col('active', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'extractedField',
        columns: [
          col('confidence', 'numeric(5,4)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 5, scale: 4 } },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('documentId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('editedManually', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('label', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('originalValue', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('sourceRefId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('valueJson', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('valueText', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'fileAsset',
        columns: [
          col('bucket', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('checksumVerified', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('duplicateOfId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('mimeType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('objectKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('originalFileName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sha256', 'character(64)', {
            notNull: true,
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 64 } },
          }),
          col('sizeBytes', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('storageProvider', 'text', {
            notNull: true,
            default: lit('yandex'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('uploadedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'finding',
        columns: [
          col('actual', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('comment', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('confidence', 'numeric(5,4)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 5, scale: 4 } },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('decidedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('decidedById', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('documentId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('expected', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('explanation', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('message', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('normRef', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('objectId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('packageId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('ruleVersionId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('severity', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('open'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'finding_severity_check_38a404f1',
            "\"severity\" IN ('info', 'warning', 'error', 'critical')",
          ),
          checkExpression(
            'finding_status_check_fdbbe627',
            "\"status\" IN ('open', 'accepted', 'dismissed', 'fixed')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'findingHistory',
        columns: [
          col('comment', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('findingId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('fromStatus', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('toStatus', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'findingHistory_fromStatus_check_e8661be2',
            "\"fromStatus\" IN ('open', 'accepted', 'dismissed', 'fixed')",
          ),
          checkExpression(
            'findingHistory_toStatus_check_ad417e61',
            "\"toStatus\" IN ('open', 'accepted', 'dismissed', 'fixed')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'findingSource',
        columns: [
          col('findingId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('sourceRefId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['findingId', 'sourceRefId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'membership',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('organizationId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('role', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('invited'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('userId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('membership_role_check_932e7473', "\"role\" IN ('owner', 'engineer')"),
          checkExpression(
            'membership_status_check_282eda46',
            "\"status\" IN ('active', 'invited', 'disabled')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'normativeSource',
        columns: [
          col('active', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('checksum', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('effectiveFrom', 'date', { codecRef: { codecId: 'pg/date-string@1' } }),
          col('effectiveTo', 'date', { codecRef: { codecId: 'pg/date-string@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('officialUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('sourceType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('storageKey', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('version', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'objectGroup',
        columns: [
          col('active', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'objectRequirementBinding',
        columns: [
          col('boundAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('objectId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('requirementSetId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('workTypeId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'objectType',
        columns: [
          col('active', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('groupId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'objectWorkType',
        columns: [
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('objectId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('active'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('workTypeId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'organization',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('slug', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('active'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'organization_kind_check_d7b4a9e6',
            "\"kind\" IN ('tenant', 'counterparty')",
          ),
          checkExpression(
            'organization_status_check_697c26d8',
            "\"status\" IN ('active', 'suspended')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'package',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('createdById', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('documentsCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('finishedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('objectId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('progress', 'numeric(5,2)', {
            notNull: true,
            default: fn("'0'::numeric(5,2)"),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 5, scale: 2 } },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('uploading'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('version', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'package_status_check_92d899f3',
            "\"status\" IN ('uploading', 'queued', 'processing', 'done', 'partial', 'failed')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'report',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('createdById', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('disclaimer', 'text', {
            notNull: true,
            default: lit('Замечания AI являются рекомендацией. В отчёт включены решения инженера.'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('findingsCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('objectId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('packageId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('readyAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('recipient', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('scope', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('queued'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('storageKey', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('version', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'report_scope_check_88a5420e',
            "\"scope\" IN ('accepted', 'errors', 'all_open')",
          ),
          checkExpression(
            'report_status_check_6480b37c',
            "\"status\" IN ('queued', 'generating', 'ready', 'failed')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'requirementItem',
        columns: [
          col('active', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('criticality', 'text', {
            notNull: true,
            default: lit('medium'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('documentTypeId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('maxCount', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('minCount', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('required', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('requirementSetId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('ruleId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'requirementItem_criticality_check_17ceeab6',
            "\"criticality\" IN ('low', 'medium', 'high', 'critical')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'requirementSet',
        columns: [
          col('customerProfileId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('objectTypeId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('draft'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('version', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('workTypeId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'requirementSet_status_check_4757a2da',
            "\"status\" IN ('draft', 'active', 'retired')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'rule',
        columns: [
          col('active', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'ruleVersion',
        columns: [
          col('active', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('normativeSourceId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('ruleId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('severity', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('version', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'ruleVersion_severity_check_38a404f1',
            "\"severity\" IN ('info', 'warning', 'error', 'critical')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'sourceRef',
        columns: [
          col('bbox', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('cell', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('documentId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('page', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('paragraph', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('quote', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('sheet', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('tableRef', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('sourceRef_kind_check_04f0fefd', "\"kind\" IN ('pdf', 'xlsx', 'docx')"),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'user',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('lastLoginAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('passwordHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('active'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'user_status_check_282eda46',
            "\"status\" IN ('active', 'invited', 'disabled')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'workType',
        columns: [
          col('active', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'checklist',
        constraint: 'checklist_packageId_key',
        columns: ['packageId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'checklistItem',
        constraint: 'checklistItem_checklistId_requirementItemId_key',
        columns: ['checklistId', 'requirementItemId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'constructionObject',
        constraint: 'constructionObject_organizationId_code_key',
        columns: ['organizationId', 'code'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'documentType',
        constraint: 'documentType_code_key',
        columns: ['code'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'fileAsset',
        constraint: 'fileAsset_organizationId_sha256_key',
        columns: ['organizationId', 'sha256'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'fileAsset',
        constraint: 'fileAsset_bucket_objectKey_key',
        columns: ['bucket', 'objectKey'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'membership',
        constraint: 'membership_organizationId_userId_key',
        columns: ['organizationId', 'userId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'normativeSource',
        constraint: 'normativeSource_code_version_key',
        columns: ['code', 'version'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'objectGroup',
        constraint: 'objectGroup_code_key',
        columns: ['code'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'objectRequirementBinding',
        constraint: 'objectRequirementBinding_objectId_workTypeId_key',
        columns: ['objectId', 'workTypeId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'objectType',
        constraint: 'objectType_code_key',
        columns: ['code'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'objectWorkType',
        constraint: 'objectWorkType_objectId_workTypeId_key',
        columns: ['objectId', 'workTypeId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'organization',
        constraint: 'organization_slug_key',
        columns: ['slug'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'package',
        constraint: 'package_objectId_version_key',
        columns: ['objectId', 'version'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'report',
        constraint: 'report_packageId_version_key',
        columns: ['packageId', 'version'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'rule',
        constraint: 'rule_code_key',
        columns: ['code'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ruleVersion',
        constraint: 'ruleVersion_ruleId_version_key',
        columns: ['ruleId', 'version'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'workType',
        constraint: 'workType_code_key',
        columns: ['code'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditLog',
        index: 'auditLog_actorId_idx_a58f6b4b',
        columns: ['actorId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditLog',
        index: 'auditLog_entityType_entityId_idx_ea0fa809',
        columns: ['entityType', 'entityId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditLog',
        index: 'auditLog_organizationId_createdAt_idx_c52d1cc3',
        columns: ['organizationId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditLog',
        index: 'auditLog_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'checklist',
        index: 'checklist_objectId_idx_08ca88de',
        columns: ['objectId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'checklistItem',
        index: 'checklistItem_checklistId_idx_2aea5937',
        columns: ['checklistId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'checklistItem',
        index: 'checklistItem_requirementItemId_idx_2cf15bee',
        columns: ['requirementItemId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'checklistItemDocument',
        index: 'checklistItemDocument_checklistItemId_idx_93aa93e9',
        columns: ['checklistItemId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'checklistItemDocument',
        index: 'checklistItemDocument_documentId_idx_825ef746',
        columns: ['documentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'constructionObject',
        index: 'constructionObject_contractorOrganizationId_idx_5ee37fd6',
        columns: ['contractorOrganizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'constructionObject',
        index: 'constructionObject_createdById_idx_8bf640ed',
        columns: ['createdById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'constructionObject',
        index: 'constructionObject_customerOrganizationId_idx_27963815',
        columns: ['customerOrganizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'constructionObject',
        index: 'constructionObject_customerProfileId_idx_dd39e3f1',
        columns: ['customerProfileId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'constructionObject',
        index: 'constructionObject_objectTypeId_idx_a6eceb0b',
        columns: ['objectTypeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'constructionObject',
        index: 'constructionObject_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'customerRequirementProfile',
        index: 'customerRequirementProfile_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'document',
        index: 'document_documentTypeId_idx_878907da',
        columns: ['documentTypeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'document',
        index: 'document_fileAssetId_idx_84361fdc',
        columns: ['fileAssetId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'document',
        index: 'document_objectId_idx_08ca88de',
        columns: ['objectId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'document',
        index: 'document_packageId_idx_51f866f4',
        columns: ['packageId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'documentStageRun',
        index: 'documentStageRun_documentId_idx_825ef746',
        columns: ['documentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'documentStageRun',
        index: 'documentStageRun_documentId_stage_idx_343658b5',
        columns: ['documentId', 'stage'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'extractedField',
        index: 'extractedField_documentId_idx_825ef746',
        columns: ['documentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'extractedField',
        index: 'extractedField_documentId_key_idx_bae03aff',
        columns: ['documentId', 'key'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'extractedField',
        index: 'extractedField_sourceRefId_idx_f8db000c',
        columns: ['sourceRefId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'fileAsset',
        index: 'fileAsset_duplicateOfId_idx_28ac86a0',
        columns: ['duplicateOfId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'fileAsset',
        index: 'fileAsset_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'finding',
        index: 'finding_decidedById_idx_8194d55f',
        columns: ['decidedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'finding',
        index: 'finding_documentId_idx_825ef746',
        columns: ['documentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'finding',
        index: 'finding_objectId_idx_08ca88de',
        columns: ['objectId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'finding',
        index: 'finding_packageId_idx_51f866f4',
        columns: ['packageId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'finding',
        index: 'finding_ruleVersionId_idx_7051a033',
        columns: ['ruleVersionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'findingHistory',
        index: 'findingHistory_findingId_idx_813b79f2',
        columns: ['findingId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'findingHistory',
        index: 'findingHistory_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'findingSource',
        index: 'findingSource_findingId_idx_813b79f2',
        columns: ['findingId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'findingSource',
        index: 'findingSource_sourceRefId_idx_f8db000c',
        columns: ['sourceRefId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'membership',
        index: 'membership_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'membership',
        index: 'membership_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'objectRequirementBinding',
        index: 'objectRequirementBinding_objectId_idx_08ca88de',
        columns: ['objectId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'objectRequirementBinding',
        index: 'objectRequirementBinding_requirementSetId_idx_648eca97',
        columns: ['requirementSetId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'objectRequirementBinding',
        index: 'objectRequirementBinding_workTypeId_idx_2e2586e9',
        columns: ['workTypeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'objectType',
        index: 'objectType_groupId_idx_e2fb5578',
        columns: ['groupId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'objectWorkType',
        index: 'objectWorkType_objectId_idx_08ca88de',
        columns: ['objectId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'objectWorkType',
        index: 'objectWorkType_workTypeId_idx_2e2586e9',
        columns: ['workTypeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'package',
        index: 'package_createdById_idx_8bf640ed',
        columns: ['createdById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'package',
        index: 'package_objectId_idx_08ca88de',
        columns: ['objectId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'report',
        index: 'report_createdById_idx_8bf640ed',
        columns: ['createdById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'report',
        index: 'report_objectId_idx_08ca88de',
        columns: ['objectId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'report',
        index: 'report_packageId_idx_51f866f4',
        columns: ['packageId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'requirementItem',
        index: 'requirementItem_documentTypeId_idx_878907da',
        columns: ['documentTypeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'requirementItem',
        index: 'requirementItem_requirementSetId_idx_648eca97',
        columns: ['requirementSetId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'requirementItem',
        index: 'requirementItem_ruleId_idx_05e770f7',
        columns: ['ruleId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'requirementSet',
        index: 'requirementSet_customerProfileId_idx_dd39e3f1',
        columns: ['customerProfileId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'requirementSet',
        index: 'requirementSet_objectTypeId_idx_a6eceb0b',
        columns: ['objectTypeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'requirementSet',
        index: 'requirementSet_workTypeId_idx_2e2586e9',
        columns: ['workTypeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ruleVersion',
        index: 'ruleVersion_normativeSourceId_idx_361bcc25',
        columns: ['normativeSourceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ruleVersion',
        index: 'ruleVersion_ruleId_idx_05e770f7',
        columns: ['ruleId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'sourceRef',
        index: 'sourceRef_documentId_idx_825ef746',
        columns: ['documentId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'auditLog',
        foreignKey: {
          name: 'auditLog_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'auditLog',
        foreignKey: {
          name: 'auditLog_actorId_fkey',
          columns: ['actorId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'checklist',
        foreignKey: {
          name: 'checklist_objectId_fkey',
          columns: ['objectId'],
          references: { schema: 'public', table: 'constructionObject', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'checklist',
        foreignKey: {
          name: 'checklist_packageId_fkey',
          columns: ['packageId'],
          references: { schema: 'public', table: 'package', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'checklistItem',
        foreignKey: {
          name: 'checklistItem_checklistId_fkey',
          columns: ['checklistId'],
          references: { schema: 'public', table: 'checklist', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'checklistItem',
        foreignKey: {
          name: 'checklistItem_requirementItemId_fkey',
          columns: ['requirementItemId'],
          references: { schema: 'public', table: 'requirementItem', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'checklistItemDocument',
        foreignKey: {
          name: 'checklistItemDocument_checklistItemId_fkey',
          columns: ['checklistItemId'],
          references: { schema: 'public', table: 'checklistItem', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'checklistItemDocument',
        foreignKey: {
          name: 'checklistItemDocument_documentId_fkey',
          columns: ['documentId'],
          references: { schema: 'public', table: 'document', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'constructionObject',
        foreignKey: {
          name: 'constructionObject_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'constructionObject',
        foreignKey: {
          name: 'constructionObject_objectTypeId_fkey',
          columns: ['objectTypeId'],
          references: { schema: 'public', table: 'objectType', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'constructionObject',
        foreignKey: {
          name: 'constructionObject_customerOrganizationId_fkey',
          columns: ['customerOrganizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'constructionObject',
        foreignKey: {
          name: 'constructionObject_contractorOrganizationId_fkey',
          columns: ['contractorOrganizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'constructionObject',
        foreignKey: {
          name: 'constructionObject_customerProfileId_fkey',
          columns: ['customerProfileId'],
          references: { schema: 'public', table: 'customerRequirementProfile', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'constructionObject',
        foreignKey: {
          name: 'constructionObject_createdById_fkey',
          columns: ['createdById'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'customerRequirementProfile',
        foreignKey: {
          name: 'customerRequirementProfile_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'document',
        foreignKey: {
          name: 'document_objectId_fkey',
          columns: ['objectId'],
          references: { schema: 'public', table: 'constructionObject', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'document',
        foreignKey: {
          name: 'document_packageId_fkey',
          columns: ['packageId'],
          references: { schema: 'public', table: 'package', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'document',
        foreignKey: {
          name: 'document_fileAssetId_fkey',
          columns: ['fileAssetId'],
          references: { schema: 'public', table: 'fileAsset', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'document',
        foreignKey: {
          name: 'document_documentTypeId_fkey',
          columns: ['documentTypeId'],
          references: { schema: 'public', table: 'documentType', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'documentStageRun',
        foreignKey: {
          name: 'documentStageRun_documentId_fkey',
          columns: ['documentId'],
          references: { schema: 'public', table: 'document', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'extractedField',
        foreignKey: {
          name: 'extractedField_documentId_fkey',
          columns: ['documentId'],
          references: { schema: 'public', table: 'document', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'extractedField',
        foreignKey: {
          name: 'extractedField_sourceRefId_fkey',
          columns: ['sourceRefId'],
          references: { schema: 'public', table: 'sourceRef', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'fileAsset',
        foreignKey: {
          name: 'fileAsset_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'fileAsset',
        foreignKey: {
          name: 'fileAsset_duplicateOfId_fkey',
          columns: ['duplicateOfId'],
          references: { schema: 'public', table: 'fileAsset', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'finding',
        foreignKey: {
          name: 'finding_objectId_fkey',
          columns: ['objectId'],
          references: { schema: 'public', table: 'constructionObject', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'finding',
        foreignKey: {
          name: 'finding_documentId_fkey',
          columns: ['documentId'],
          references: { schema: 'public', table: 'document', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'finding',
        foreignKey: {
          name: 'finding_packageId_fkey',
          columns: ['packageId'],
          references: { schema: 'public', table: 'package', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'finding',
        foreignKey: {
          name: 'finding_ruleVersionId_fkey',
          columns: ['ruleVersionId'],
          references: { schema: 'public', table: 'ruleVersion', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'finding',
        foreignKey: {
          name: 'finding_decidedById_fkey',
          columns: ['decidedById'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'findingHistory',
        foreignKey: {
          name: 'findingHistory_findingId_fkey',
          columns: ['findingId'],
          references: { schema: 'public', table: 'finding', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'findingHistory',
        foreignKey: {
          name: 'findingHistory_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'findingSource',
        foreignKey: {
          name: 'findingSource_findingId_fkey',
          columns: ['findingId'],
          references: { schema: 'public', table: 'finding', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'findingSource',
        foreignKey: {
          name: 'findingSource_sourceRefId_fkey',
          columns: ['sourceRefId'],
          references: { schema: 'public', table: 'sourceRef', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'membership',
        foreignKey: {
          name: 'membership_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'membership',
        foreignKey: {
          name: 'membership_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'objectRequirementBinding',
        foreignKey: {
          name: 'objectRequirementBinding_objectId_fkey',
          columns: ['objectId'],
          references: { schema: 'public', table: 'constructionObject', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'objectRequirementBinding',
        foreignKey: {
          name: 'objectRequirementBinding_workTypeId_fkey',
          columns: ['workTypeId'],
          references: { schema: 'public', table: 'workType', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'objectRequirementBinding',
        foreignKey: {
          name: 'objectRequirementBinding_requirementSetId_fkey',
          columns: ['requirementSetId'],
          references: { schema: 'public', table: 'requirementSet', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'objectType',
        foreignKey: {
          name: 'objectType_groupId_fkey',
          columns: ['groupId'],
          references: { schema: 'public', table: 'objectGroup', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'objectWorkType',
        foreignKey: {
          name: 'objectWorkType_objectId_fkey',
          columns: ['objectId'],
          references: { schema: 'public', table: 'constructionObject', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'objectWorkType',
        foreignKey: {
          name: 'objectWorkType_workTypeId_fkey',
          columns: ['workTypeId'],
          references: { schema: 'public', table: 'workType', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'package',
        foreignKey: {
          name: 'package_objectId_fkey',
          columns: ['objectId'],
          references: { schema: 'public', table: 'constructionObject', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'package',
        foreignKey: {
          name: 'package_createdById_fkey',
          columns: ['createdById'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'report',
        foreignKey: {
          name: 'report_objectId_fkey',
          columns: ['objectId'],
          references: { schema: 'public', table: 'constructionObject', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'report',
        foreignKey: {
          name: 'report_packageId_fkey',
          columns: ['packageId'],
          references: { schema: 'public', table: 'package', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'report',
        foreignKey: {
          name: 'report_createdById_fkey',
          columns: ['createdById'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'requirementItem',
        foreignKey: {
          name: 'requirementItem_requirementSetId_fkey',
          columns: ['requirementSetId'],
          references: { schema: 'public', table: 'requirementSet', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'requirementItem',
        foreignKey: {
          name: 'requirementItem_documentTypeId_fkey',
          columns: ['documentTypeId'],
          references: { schema: 'public', table: 'documentType', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'requirementItem',
        foreignKey: {
          name: 'requirementItem_ruleId_fkey',
          columns: ['ruleId'],
          references: { schema: 'public', table: 'rule', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'requirementSet',
        foreignKey: {
          name: 'requirementSet_objectTypeId_fkey',
          columns: ['objectTypeId'],
          references: { schema: 'public', table: 'objectType', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'requirementSet',
        foreignKey: {
          name: 'requirementSet_workTypeId_fkey',
          columns: ['workTypeId'],
          references: { schema: 'public', table: 'workType', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'requirementSet',
        foreignKey: {
          name: 'requirementSet_customerProfileId_fkey',
          columns: ['customerProfileId'],
          references: { schema: 'public', table: 'customerRequirementProfile', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ruleVersion',
        foreignKey: {
          name: 'ruleVersion_ruleId_fkey',
          columns: ['ruleId'],
          references: { schema: 'public', table: 'rule', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ruleVersion',
        foreignKey: {
          name: 'ruleVersion_normativeSourceId_fkey',
          columns: ['normativeSourceId'],
          references: { schema: 'public', table: 'normativeSource', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'sourceRef',
        foreignKey: {
          name: 'sourceRef_documentId_fkey',
          columns: ['documentId'],
          references: { schema: 'public', table: 'document', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
