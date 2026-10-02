import { randomUUID } from "node:crypto";
import type { AppDb } from "./db.token";

// Сиды справочников этапа 1.
// Канон данных: docs/AI-PTO_Project_Documentation_v0.2.md, п.2 (закрытые решения).
// Идемпотентно: повторный запуск не создаёт дубликатов и не трогает совпадающие строки.

interface RefSeed {
  code: string;
  name: string;
  description: string;
  active?: boolean;
}

interface ObjectTypeSeed extends RefSeed {
  groupCode: string;
}

export const OBJECT_GROUP_SEEDS: RefSeed[] = [
  { code: "residential", name: "Жилой", description: "Жилые объекты недвижимости" },
  { code: "industrial", name: "Промышленный", description: "Промышленные объекты недвижимости" },
];

export const OBJECT_TYPE_SEEDS: ObjectTypeSeed[] = [
  {
    code: "apartment_building",
    name: "Многоквартирный жилой дом",
    description: "Многоквартирный жилой дом",
    groupCode: "residential",
  },
  {
    code: "production_building",
    name: "Производственное здание",
    description: "Производственное здание",
    groupCode: "industrial",
  },
];

export const WORK_TYPE_SEEDS: RefSeed[] = [
  { code: "monolith", name: "Монолитные работы", description: "Монолитное железобетонное строительство" },
  { code: "welding", name: "Сварочные работы", description: "Сварочные работы" },
  { code: "engineering_networks", name: "Инженерные сети", description: "Инженерные системы и сети" },
  { code: "electrical", name: "Электромонтажные работы", description: "Электромонтажные работы" },
  { code: "ventilation", name: "Вентиляция", description: "Монтаж систем вентиляции" },
];

// unknown сидируется неактивным: тип нужен как FK для неклассифицированных
// документов, но не должен предлагаться пользователю при загрузке.
export const DOCUMENT_TYPE_SEEDS: RefSeed[] = [
  { code: "aosr", name: "АОСР", description: "Акт о приемке выполненных работ" },
  { code: "general_work_log", name: "Общий журнал работ", description: "Выписка из общего журнала работ" },
  { code: "concrete_log", name: "Журнал бетонных работ", description: "Выписка из журнала бетонных работ" },
  { code: "welding_log", name: "Журнал сварочных работ", description: "Выписка из журнала сварочных работ" },
  { code: "material_passport", name: "Паспорт материала", description: "Паспорт материала, выписка" },
  { code: "as_built_scheme", name: "Исполнительная схема", description: "Исполнительная схема" },
  { code: "test_report", name: "Протокол испытаний", description: "Протокол испытаний, выписка" },
  { code: "other", name: "Прочее", description: "Прочий документ" },
  { code: "unknown", name: "Не распознано", description: "Документ, не отнесённый к типу", active: false },
];

export interface RefSeedSummary {
  created: number;
  updated: number;
  unchanged: number;
}

export interface SeedResult {
  objectGroups: RefSeedSummary;
  objectTypes: RefSeedSummary;
  workTypes: RefSeedSummary;
  documentTypes: RefSeedSummary;
}

function emptySummary(): RefSeedSummary {
  return { created: 0, updated: 0, unchanged: 0 };
}

function needsUpdate(row: { name: string; description: string | null; active: boolean }, seed: RefSeed): boolean {
  return row.name !== seed.name || row.description !== seed.description || row.active !== (seed.active ?? true);
}

export async function runSeed(db: AppDb): Promise<SeedResult> {
  const result: SeedResult = {
    objectGroups: emptySummary(),
    objectTypes: emptySummary(),
    workTypes: emptySummary(),
    documentTypes: emptySummary(),
  };

  await db.transaction(async (tx) => {
    const groupIds = new Map<string, string>();

    for (const seed of OBJECT_GROUP_SEEDS) {
      const existing = await tx.orm.public.ObjectGroup.where({ code: seed.code }).first();
      const active = seed.active ?? true;

      if (!existing) {
        const id = randomUUID();
        await tx.orm.public.ObjectGroup.create({
          id,
          code: seed.code,
          name: seed.name,
          description: seed.description,
          active,
        });
        groupIds.set(seed.code, id);
        result.objectGroups.created++;
      } else {
        groupIds.set(seed.code, existing.id);
        if (needsUpdate(existing, seed)) {
          await tx.orm.public.ObjectGroup.where({ id: existing.id }).update({
            name: seed.name,
            description: seed.description,
            active,
          });
          result.objectGroups.updated++;
        } else {
          result.objectGroups.unchanged++;
        }
      }
    }

    for (const seed of OBJECT_TYPE_SEEDS) {
      const groupId = groupIds.get(seed.groupCode);
      if (!groupId) {
        throw new Error(`Reference seed error: group "${seed.groupCode}" is not seeded`);
      }
      const active = seed.active ?? true;
      const existing = await tx.orm.public.ObjectType.where({ code: seed.code }).first();

      if (!existing) {
        await tx.orm.public.ObjectType.create({
          id: randomUUID(),
          groupId,
          code: seed.code,
          name: seed.name,
          description: seed.description,
          active,
        });
        result.objectTypes.created++;
      } else if (needsUpdate(existing, seed) || existing.groupId !== groupId) {
        await tx.orm.public.ObjectType.where({ id: existing.id }).update({
          groupId,
          name: seed.name,
          description: seed.description,
          active,
        });
        result.objectTypes.updated++;
      } else {
        result.objectTypes.unchanged++;
      }
    }

    for (const seed of WORK_TYPE_SEEDS) {
      const active = seed.active ?? true;
      const existing = await tx.orm.public.WorkType.where({ code: seed.code }).first();

      if (!existing) {
        await tx.orm.public.WorkType.create({
          id: randomUUID(),
          code: seed.code,
          name: seed.name,
          description: seed.description,
          active,
        });
        result.workTypes.created++;
      } else if (needsUpdate(existing, seed)) {
        await tx.orm.public.WorkType.where({ id: existing.id }).update({
          name: seed.name,
          description: seed.description,
          active,
        });
        result.workTypes.updated++;
      } else {
        result.workTypes.unchanged++;
      }
    }

    for (const seed of DOCUMENT_TYPE_SEEDS) {
      const active = seed.active ?? true;
      const existing = await tx.orm.public.DocumentType.where({ code: seed.code }).first();

      if (!existing) {
        await tx.orm.public.DocumentType.create({
          id: randomUUID(),
          code: seed.code,
          name: seed.name,
          description: seed.description,
          active,
        });
        result.documentTypes.created++;
      } else if (needsUpdate(existing, seed)) {
        await tx.orm.public.DocumentType.where({ id: existing.id }).update({
          name: seed.name,
          description: seed.description,
          active,
        });
        result.documentTypes.updated++;
      } else {
        result.documentTypes.unchanged++;
      }
    }
  });

  return result;
}
