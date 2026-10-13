#!/usr/bin/env -S node
import type {
  Contract as End,
  Contract as Start,
} from '../../snapshots/7fc73f779409e021970741232f3d0444f72d5499c43c28efba9d996968842952/contract';
import endContract from '../../snapshots/7fc73f779409e021970741232f3d0444f72d5499c43c28efba9d996968842952/contract.json' with { type: 'json' };
import startContract from '../../snapshots/7fc73f779409e021970741232f3d0444f72d5499c43c28efba9d996968842952/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, rawSql } from '@prisma/orm-postgres/migration';

const SEED_SQL = `
INSERT INTO "public"."objectGroup" (id, code, name, description, active)
VALUES
  (gen_random_uuid(), 'RES', 'Жилые и коммерческие', NULL, true),
  (gen_random_uuid(), 'IND', 'Производственные и складские', NULL, true),
  (gen_random_uuid(), 'SOC', 'Социальные', NULL, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO "public"."objectType" (id, "groupId", code, name, description, active)
SELECT gen_random_uuid(), g.id, v.code, v.name, NULL, true
FROM "public"."objectGroup" g
JOIN (VALUES
  ('RES', 'MKD', 'Многоквартирный жилой дом'),
  ('RES', 'TC', 'Торговый центр'),
  ('IND', 'SKLAD', 'Склад'),
  ('IND', 'PROD', 'Производственный корпус'),
  ('SOC', 'SOC', 'Социальный объект')
) AS v(gcode, code, name) ON g.code = v.gcode
ON CONFLICT (code) DO NOTHING;

INSERT INTO "public"."workType" (id, code, name, description, active)
VALUES
  (gen_random_uuid(), 'CONCRETE', 'Монолитные работы', NULL, true),
  (gen_random_uuid(), 'WELDING', 'Сварочные работы', NULL, true),
  (gen_random_uuid(), 'ELECTRICAL', 'Электромонтажные работы', NULL, true),
  (gen_random_uuid(), 'HVAC', 'Вентиляция и кондиционирование', NULL, true),
  (gen_random_uuid(), 'PLUMBING', 'Водоснабжение и канализация', NULL, true),
  (gen_random_uuid(), 'FINISHING', 'Отделочные работы', NULL, true),
  (gen_random_uuid(), 'PILING', 'Сваивание', NULL, true),
  (gen_random_uuid(), 'WATERPROOFING', 'Гидроизоляция', NULL, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO "public"."organization" (id, name, slug, kind, status, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'ООО «СтройМастер»', 'stroymaster', 'counterparty', 'active', NOW(), NOW()),
  (gen_random_uuid(), 'АО «Застройщик-Девелопер»', 'zastroyshchik', 'counterparty', 'active', NOW(), NOW()),
  (gen_random_uuid(), 'ООО «ТехЗаказчик-Проект»', 'techzakazchik', 'counterparty', 'active', NOW(), NOW()),
  (gen_random_uuid(), 'ИП Иванов И.И.', 'ip-ivanov', 'counterparty', 'active', NOW(), NOW()),
  (gen_random_uuid(), 'ООО «СтройПодрядчик»', 'stroypodryadchik', 'counterparty', 'active', NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;
`.trim();

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      rawSql({
        id: 'data_migration.seed_catalogs',
        label: 'Seed object groups, types, work types, counterparties',
        summary: 'Idempotent catalog seed for create-object form',
        operationClass: 'data',
        invariantId: 'seed:catalogs-v1',
        target: {
          id: 'postgres',
          details: {
            schema: 'public',
            objectType: 'table',
            name: 'objectGroup',
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
            description: 'insert catalog rows',
            sql: SEED_SQL,
            params: [],
          },
        ],
        postcheck: [
          {
            description: 'catalog tables still exist',
            sql: `SELECT (
              to_regclass('"public"."objectGroup"') IS NOT NULL
              AND to_regclass('"public"."objectType"') IS NOT NULL
              AND to_regclass('"public"."workType"') IS NOT NULL
              AND to_regclass('"public"."organization"') IS NOT NULL
            ) AS "result"`,
            params: [],
          },
        ],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
