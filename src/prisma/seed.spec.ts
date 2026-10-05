import { DOCUMENT_TYPE_SEEDS, OBJECT_GROUP_SEEDS, OBJECT_TYPE_SEEDS, WORK_TYPE_SEEDS, runSeed } from "./seed.js";
import type { AppDb } from "./db.token.js";

type Row = Record<string, unknown>;

interface FakeTable {
  rows: Row[];
  where: jest.Mock;
  all: jest.Mock;
  first: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
}

interface FakeDb {
  orm: {
    public: {
      ObjectGroup: FakeTable;
      ObjectType: FakeTable;
      WorkType: FakeTable;
      DocumentType: FakeTable;
    };
  };
  transaction: jest.Mock;
}

/** Имитация модели Prisma 8: where(criteria).first()/all()/update(), create(). */
function fakeTable(initial: Row[] = []): FakeTable {
  const rows: Row[] = initial.map((row) => ({ ...row }));
  let criteria: Record<string, unknown> = {};

  const matches = (row: Row) => Object.entries(criteria).every(([key, value]) => row[key] === value);
  const selected = () => rows.filter(matches);

  const table: FakeTable = {
    rows,
    where: jest.fn((condition: unknown) => {
      criteria = typeof condition === "object" && condition !== null ? (condition as Record<string, unknown>) : {};
      return table;
    }),
    all: jest.fn(() => Promise.resolve(selected())),
    first: jest.fn(() => Promise.resolve(selected()[0] ?? null)),
    create: jest.fn((data: Row) => {
      rows.push({ ...data });
      return Promise.resolve(data);
    }),
    update: jest.fn((data: Row) => {
      for (const row of selected()) {
        Object.assign(row, data);
      }
      return Promise.resolve(data);
    }),
    delete: jest.fn(() => {
      const kept = rows.filter((row) => !matches(row));
      rows.length = 0;
      rows.push(...kept);
      return Promise.resolve({ affectedRows: 1 });
    }),
  };
  return table;
}

function fakeDb(seed: Partial<Record<string, Row[]>> = {}): FakeDb {
  const tables = {
    ObjectGroup: fakeTable(seed.ObjectGroup),
    ObjectType: fakeTable(seed.ObjectType),
    WorkType: fakeTable(seed.WorkType),
    DocumentType: fakeTable(seed.DocumentType),
  };
  const db: FakeDb = {
    orm: { public: tables },
    transaction: jest.fn((fn: (tx: FakeDb) => Promise<unknown>) => fn(db)),
  };
  return db;
}

const asAppDb = (db: FakeDb): AppDb => db as unknown as AppDb;

const codes = (table: FakeTable): unknown[] => table.rows.map((row) => row.code).sort();

const WORK_TYPE_CODES_SORTED = ["electrical", "engineering_networks", "monolith", "ventilation", "welding"];

describe("runSeed", () => {
  it("создаёт все канонические справочники в пустой базе", async () => {
    const db = fakeDb();

    const result = await runSeed(asAppDb(db));

    expect(codes(db.orm.public.ObjectGroup)).toEqual(["industrial", "residential"]);
    expect(codes(db.orm.public.ObjectType)).toEqual(["apartment_building", "production_building"]);
    expect(codes(db.orm.public.WorkType)).toEqual(WORK_TYPE_CODES_SORTED);
    expect(db.orm.public.DocumentType.rows).toHaveLength(9);

    expect(result.objectGroups).toEqual({ created: 2, updated: 0, unchanged: 0 });
    expect(result.objectTypes).toEqual({ created: 2, updated: 0, unchanged: 0 });
    expect(result.workTypes).toEqual({ created: 5, updated: 0, unchanged: 0 });
    expect(result.documentTypes).toEqual({ created: 9, updated: 0, unchanged: 0 });
  });

  it("коды совпадают с каноном AI-PTO v0.2", () => {
    expect(OBJECT_GROUP_SEEDS.map((seed) => seed.code).sort()).toEqual(["industrial", "residential"]);
    expect(OBJECT_TYPE_SEEDS.map((seed) => seed.code).sort()).toEqual(["apartment_building", "production_building"]);
    expect(WORK_TYPE_SEEDS.map((seed) => seed.code).sort()).toEqual(WORK_TYPE_CODES_SORTED);
    expect(DOCUMENT_TYPE_SEEDS.map((seed) => seed.code).sort()).toEqual([
      "aosr",
      "as_built_scheme",
      "concrete_log",
      "general_work_log",
      "material_passport",
      "other",
      "test_report",
      "unknown",
      "welding_log",
    ]);
    expect(OBJECT_GROUP_SEEDS).toHaveLength(2);
    expect(OBJECT_TYPE_SEEDS).toHaveLength(2);
    expect(WORK_TYPE_SEEDS).toHaveLength(5);
    expect(DOCUMENT_TYPE_SEEDS).toHaveLength(9);
  });

  it("повторный запуск идемпотентен: ничего не создаёт и не обновляет", async () => {
    const db = fakeDb();
    await runSeed(asAppDb(db));
    const createCalls = [
      db.orm.public.ObjectGroup.create,
      db.orm.public.ObjectType.create,
      db.orm.public.WorkType.create,
      db.orm.public.DocumentType.create,
    ].map((create) => create.mock.calls.length);

    const second = await runSeed(asAppDb(db));

    expect(second).toEqual({
      objectGroups: { created: 0, updated: 0, unchanged: 2 },
      objectTypes: { created: 0, updated: 0, unchanged: 2 },
      workTypes: { created: 0, updated: 0, unchanged: 5 },
      documentTypes: { created: 0, updated: 0, unchanged: 9 },
    });
    expect(
      [
        db.orm.public.ObjectGroup.create,
        db.orm.public.ObjectType.create,
        db.orm.public.WorkType.create,
        db.orm.public.DocumentType.create,
      ].map((create) => create.mock.calls.length),
    ).toEqual(createCalls);
    expect(db.orm.public.ObjectGroup.rows).toHaveLength(2);
    expect(db.orm.public.DocumentType.rows).toHaveLength(9);
  });

  it("обновляет расхождения и не трогает чужие строки", async () => {
    const db = fakeDb({
      ObjectGroup: [
        { id: "g-other", code: "other_group", name: "Чужая группа", description: null, active: true },
        { id: "g-res", code: "residential", name: "Old name", description: "old", active: false },
      ],
      DocumentType: [{ id: "d-aosr", code: "aosr", name: "Old AOSR", description: null, active: false }],
    });

    const result = await runSeed(asAppDb(db));

    expect(result.objectGroups).toEqual({ created: 1, updated: 1, unchanged: 0 });
    expect(result.documentTypes).toEqual({ created: 8, updated: 1, unchanged: 0 });

    const residential = db.orm.public.ObjectGroup.rows.find((row) => row.code === "residential");
    expect(residential).toMatchObject({
      id: "g-res",
      name: "Жилой",
      description: "Жилые объекты недвижимости",
      active: true,
    });

    const foreign = db.orm.public.ObjectGroup.rows.find((row) => row.code === "other_group");
    expect(foreign).toEqual({
      id: "g-other",
      code: "other_group",
      name: "Чужая группа",
      description: null,
      active: true,
    });
  });

  it("тип объекта ссылается на свою группу", async () => {
    const db = fakeDb();

    await runSeed(asAppDb(db));

    const groupByCode = new Map(db.orm.public.ObjectGroup.rows.map((row) => [row.code, row.id] as const));
    for (const row of db.orm.public.ObjectType.rows) {
      const expectedGroup = row.code === "apartment_building" ? "residential" : "industrial";
      expect(row.groupId).toBe(groupByCode.get(expectedGroup));
    }
  });

  it("unknown сидируется неактивным, остальные типы документов активны", async () => {
    const db = fakeDb();

    await runSeed(asAppDb(db));

    for (const row of db.orm.public.DocumentType.rows) {
      expect(row.active).toBe(row.code !== "unknown");
    }
  });
});
