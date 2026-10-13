#!/usr/bin/env -S node
import type {
  Contract as End,
  Contract as Start,
} from '../../snapshots/7fc73f779409e021970741232f3d0444f72d5499c43c28efba9d996968842952/contract';
import endContract from '../../snapshots/7fc73f779409e021970741232f3d0444f72d5499c43c28efba9d996968842952/contract.json' with { type: 'json' };
import startContract from '../../snapshots/7fc73f779409e021970741232f3d0444f72d5499c43c28efba9d996968842952/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, rawSql } from '@prisma/orm-postgres/migration';

// unknown — active=false: нужен как FK для неклассифицированных документов,
// но не должен предлагаться пользователю при выборе типа.
const SEED_SQL = `
INSERT INTO "public"."documentType" (id, code, name, description, active)
VALUES
  (gen_random_uuid(), 'aosr', 'АОСР', 'Акт освидетельствования скрытых работ', true),
  (gen_random_uuid(), 'general_work_log', 'Общий журнал работ', 'Выписка из общего журнала работ', true),
  (gen_random_uuid(), 'concrete_log', 'Журнал бетонных работ', 'Выписка из журнала бетонных работ', true),
  (gen_random_uuid(), 'welding_log', 'Журнал сварочных работ', 'Выписка из журнала сварочных работ', true),
  (gen_random_uuid(), 'material_passport', 'Паспорт материала', 'Паспорт материала, выписка', true),
  (gen_random_uuid(), 'as_built_scheme', 'Исполнительная схема', 'Исполнительная схема', true),
  (gen_random_uuid(), 'test_report', 'Протокол испытаний', 'Протокол испытаний, выписка', true),
  (gen_random_uuid(), 'other', 'Прочее', 'Прочий документ', true),
  (gen_random_uuid(), 'unknown', 'Не распознано', 'Документ, не отнесённый к типу', false)
ON CONFLICT (code) DO NOTHING;
`.trim();

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      rawSql({
        id: 'data_migration.seed_document_types',
        label: 'Seed document types',
        summary: 'Idempotent DocumentType seed for package upload (requires code=unknown)',
        operationClass: 'data',
        invariantId: 'seed:document-types-v1',
        target: {
          id: 'postgres',
          details: {
            schema: 'public',
            objectType: 'table',
            name: 'documentType',
          },
        },
        precheck: [
          {
            description: 'always allow seed (idempotent via ON CONFLICT)',
            sql: 'SELECT true AS "result"',
            params: [],
          },
        ],
        execute: [
          {
            description: 'insert documentType rows',
            sql: SEED_SQL,
            params: [],
          },
        ],
        postcheck: [
          {
            description: 'documentType table still exists',
            sql: `SELECT (to_regclass('"public"."documentType"') IS NOT NULL) AS "result"`,
            params: [],
          },
        ],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
