import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import type { User } from "../../common/dto/openapi.types.js";
import type { SessionService } from "../auth/session.service.js";
import { EmployeesService } from "./employees.service.js";

function chainable(result: unknown) {
  const api: Record<string, jest.Mock> = {};
  const self = () => api;
  for (const method of ["where", "include", "orderBy", "select", "all", "first", "create", "update", "delete"]) {
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

function makeMembership(overrides: Record<string, unknown> = {}) {
  return {
    id: "mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmmm",
    organizationId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    userId: "11111111-1111-1111-1111-111111111111",
    role: "engineer",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    user: {
      id: "11111111-1111-1111-1111-111111111111",
      email: "eng@example.com",
      name: "Engineer One",
      status: "active",
    },
    ...overrides,
  };
}

describe("EmployeesService", () => {
  const orgId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  const engineer: User = {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    email: "viewer@example.com",
    name: "Viewer",
    organizationId: orgId,
    role: "engineer",
  };
  const owner: User = {
    id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    email: "owner@example.com",
    name: "Owner",
    organizationId: orgId,
    role: "owner",
  };

  let membership: MockChain;
  let user: MockChain;
  let db: MockDb;
  let revokeAllSessionsForUser: jest.Mock;
  let service: EmployeesService;

  beforeEach(() => {
    membership = chainable([]);
    user = chainable(null);
    db = {
      orm: {
        public: {
          Membership: membership,
          User: user,
        },
      },
      transaction: jest.fn(async (fn) => fn(db)),
    };
    revokeAllSessionsForUser = jest.fn().mockResolvedValue(undefined);
    service = new EmployeesService(
      db as never,
      {
        revokeAllSessionsForUser,
      } as unknown as SessionService,
    );
  });

  it("lists only active engineers of the current organization", async () => {
    membership.all.mockResolvedValue([
      makeMembership(),
      makeMembership({
        userId: "22222222-2222-2222-2222-222222222222",
        user: {
          id: "22222222-2222-2222-2222-222222222222",
          email: "disabled@example.com",
          name: "Disabled",
          status: "disabled",
        },
      }),
    ]);

    await expect(service.listEmployees(engineer)).resolves.toEqual([
      {
        id: "11111111-1111-1111-1111-111111111111",
        email: "eng@example.com",
        name: "Engineer One",
        organizationId: orgId,
        role: "engineer",
        status: "active",
      },
    ]);
    expect(membership.where).toHaveBeenCalledWith({
      organizationId: orgId,
      role: "engineer",
      status: "active",
    });
  });

  it("forbids engineer from get/create/update/delete", async () => {
    await expect(service.getEmployee(engineer, "11111111-1111-1111-1111-111111111111")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      service.createEmployee(engineer, {
        email: "new@example.com",
        name: "New",
        password: "password1",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.updateEmployee(engineer, "11111111-1111-1111-1111-111111111111", { name: "X" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.deleteEmployee(engineer, "11111111-1111-1111-1111-111111111111")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("returns 404 for missing engineer in organization", async () => {
    membership.first.mockResolvedValue(null);
    await expect(service.getEmployee(owner, "11111111-1111-1111-1111-111111111111")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("rejects create when email is taken", async () => {
    user.first.mockResolvedValue({ id: "existing" });
    await expect(
      service.createEmployee(owner, {
        email: "taken@example.com",
        name: "Taken",
        password: "password1",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("creates active engineer membership", async () => {
    user.first.mockResolvedValue(null);

    const created = await service.createEmployee(owner, {
      email: "new@example.com",
      name: "New Engineer",
      password: "password1",
    });

    expect(created).toMatchObject({
      email: "new@example.com",
      name: "New Engineer",
      organizationId: orgId,
      role: "engineer",
      status: "active",
    });
    expect(db.transaction).toHaveBeenCalled();
    expect(user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "new@example.com",
        name: "New Engineer",
        status: "active",
        passwordHash: expect.any(String),
      }),
    );
    expect(membership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: orgId,
        role: "engineer",
        status: "active",
        userId: created.id,
      }),
    );
  });

  it("soft-deletes engineer and revokes sessions", async () => {
    const row = makeMembership();
    membership.first.mockResolvedValue(row);

    await service.deleteEmployee(owner, row.userId);

    expect(membership.update).toHaveBeenCalledWith({ status: "disabled" });
    expect(user.update).toHaveBeenCalledWith({ status: "disabled" });
    expect(revokeAllSessionsForUser).toHaveBeenCalledWith(row.userId);
  });

  it("forbids deleting own account", async () => {
    await expect(service.deleteEmployee(owner, owner.id)).rejects.toBeInstanceOf(ForbiddenException);
    expect(revokeAllSessionsForUser).not.toHaveBeenCalled();
  });
});
