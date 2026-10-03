import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { ObjectsService } from "./objects.service.js";
import type { User } from "../../common/dto/openapi.types.js";

function chainable(result: unknown) {
  const api: Record<string, jest.Mock> = {};
  const self = () => api;
  for (const method of [
    "where",
    "include",
    "orderBy",
    "select",
    "all",
    "first",
    "create",
    "update",
    "delete",
  ]) {
    api[method] = jest.fn(self);
  }
  api.all = jest.fn(() => Promise.resolve(Array.isArray(result) ? result : []));
  api.first = jest.fn(() => Promise.resolve(Array.isArray(result) ? (result[0] ?? null) : result));
  api.create = jest.fn((row: unknown) => Promise.resolve(row));
  api.update = jest.fn((row: unknown) => Promise.resolve(row));
  api.delete = jest.fn(() => Promise.resolve({ affectedRows: 1 }));
  return api;
}

type MockChain = ReturnType<typeof chainable>;
type MockDb = {
  orm: {
    public: Record<string, MockChain>;
  };
  transaction: (fn: (tx: MockDb) => Promise<unknown>) => Promise<unknown>;
};

function makeObjectRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    organizationId: "org-1",
    objectTypeId: "type-1",
    customerOrganizationId: null,
    contractorOrganizationId: null,
    customerProfileId: null,
    code: "OBJ-1",
    name: "Объект 1",
    address: null,
    status: "draft",
    description: null,
    startDate: null,
    plannedEndDate: null,
    actualEndDate: null,
    createdById: "user-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    archivedAt: null,
    objectType: {
      id: "type-1",
      code: "residential",
      name: "Жилой",
      description: null,
      group: { id: "g1", code: "buildings", name: "Здания", active: true },
    },
    customerOrganization: null,
    contractorOrganization: null,
    workTypes: [
      {
        workType: { id: "wt-1", code: "monolith", name: "Монолит", description: null },
      },
    ],
    ...overrides,
  };
}

describe("ObjectsService", () => {
  const engineer: User = {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    email: "eng@example.com",
    name: "Engineer",
    organizationId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    role: "engineer",
  };

  const owner: User = { ...engineer, role: "owner", id: "cccccccc-cccc-cccc-cccc-cccccccccccc" };

  let constructionObject: ReturnType<typeof chainable>;
  let organization: ReturnType<typeof chainable>;
  let objectType: ReturnType<typeof chainable>;
  let workType: ReturnType<typeof chainable>;
  let objectWorkType: ReturnType<typeof chainable>;
  let auditLog: ReturnType<typeof chainable>;
  let db: MockDb;
  let service: ObjectsService;

  beforeEach(() => {
    constructionObject = chainable(null);
    organization = chainable([]);
    objectType = chainable(null);
    workType = chainable([]);
    objectWorkType = chainable(null);
    auditLog = chainable(null);

    db = {
      orm: {
        public: {
          ConstructionObject: constructionObject,
          Organization: organization,
          ObjectType: objectType,
          WorkType: workType,
          ObjectWorkType: objectWorkType,
          AuditLog: auditLog,
        },
      },
      transaction: jest.fn(async (fn) => fn(db)),
    };

    service = new ObjectsService(db as never);
  });

  it("returns 404 for missing object in current organization", async () => {
    constructionObject.first.mockResolvedValue(null);
    await expect(service.getObject(engineer, "11111111-1111-1111-1111-111111111111")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("rejects non-counterparty customer with 422", async () => {
    objectType.first.mockResolvedValue({ id: "type-1", active: true });
    workType.all.mockResolvedValue([{ id: "wt-1" }]);
    organization.first.mockResolvedValue(null);

    await expect(
      service.createObject(engineer, {
        code: "A-1",
        name: "Test",
        objectTypeId: "type-1",
        workTypeIds: ["wt-1"],
        customerOrganizationId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it("rejects illegal status transition with 409", async () => {
    constructionObject.first.mockResolvedValue(makeObjectRow({ status: "draft" }));
    await expect(
      service.changeStatus(engineer, "11111111-1111-1111-1111-111111111111", { status: "completed" }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("forbids engineer from archiving", async () => {
    constructionObject.first.mockResolvedValue(makeObjectRow({ status: "active" }));
    await expect(
      service.archiveObject(engineer, "11111111-1111-1111-1111-111111111111"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects second archive with 409", async () => {
    constructionObject.first.mockResolvedValue(makeObjectRow({ status: "archived" }));
    await expect(
      service.archiveObject(owner, "11111111-1111-1111-1111-111111111111"),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects editing archived object with 409", async () => {
    constructionObject.first.mockResolvedValue(makeObjectRow({ status: "archived" }));
    await expect(
      service.updateObject(engineer, "11111111-1111-1111-1111-111111111111", {
        code: "A-1",
        name: "X",
        objectTypeId: "type-1",
        workTypeIds: ["wt-1"],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("hides archived objects unless includeArchived=true", async () => {
    const rows = [makeObjectRow({ status: "active" })];
    constructionObject.all.mockResolvedValue(rows);

    await service.listObjects(engineer, {});
    expect(constructionObject.where).toHaveBeenCalledTimes(2);

    constructionObject.where.mockClear();
    await service.listObjects(engineer, { includeArchived: "true" });
    expect(constructionObject.where).toHaveBeenCalledTimes(1);
  });
});
