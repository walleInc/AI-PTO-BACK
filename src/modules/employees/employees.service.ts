import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Employee, EmployeeCreate, EmployeeUpdate, User } from "../../common/dto/openapi.types.js";
import { DB, type AppDb } from "../../prisma/db.token.js";
import { hashPassword } from "../auth/password.js";
import { SessionService } from "../auth/session.service.js";

type MembershipWithUser = {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  status: string;
  user?: {
    id: string;
    email: string;
    name: string;
    status: string;
  } | null;
};

@Injectable()
export class EmployeesService {
  constructor(
    @Inject(DB) private readonly db: AppDb,
    private readonly sessions: SessionService,
  ) {}

  async listEmployees(user: User): Promise<Employee[]> {
    const rows = await this.db.orm.public.Membership.where({
      organizationId: user.organizationId,
      role: "engineer",
      status: "active",
    })
      .include("user")
      .orderBy((m) => m.createdAt.asc())
      .all();

    const employees: Employee[] = [];
    for (const row of rows) {
      if (!row.user || row.user.status !== "active") {
        continue;
      }
      employees.push(
        this.toDto({
          id: row.id,
          organizationId: row.organizationId,
          userId: row.userId,
          role: row.role,
          status: row.status,
          user: {
            id: row.user.id,
            email: row.user.email,
            name: row.user.name,
            status: row.user.status,
          },
        }),
      );
    }
    return employees;
  }

  async getEmployee(actor: User, employeeId: string): Promise<Employee> {
    this.assertOwner(actor);
    const row = await this.loadActiveEngineerOrThrow(actor.organizationId, employeeId);
    return this.toDto(row);
  }

  async createEmployee(actor: User, body: EmployeeCreate): Promise<Employee> {
    this.assertOwner(actor);
    await this.assertEmailAvailable(body.email);

    const id = randomUUID();
    const passwordHash = await hashPassword(body.password);

    await this.db.transaction(async (tx) => {
      await tx.orm.public.User.create({
        id,
        email: body.email,
        name: body.name,
        passwordHash,
        status: "active",
      });
      await tx.orm.public.Membership.create({
        id: randomUUID(),
        organizationId: actor.organizationId,
        userId: id,
        role: "engineer",
        status: "active",
      });
    });

    return {
      id,
      email: body.email,
      name: body.name,
      organizationId: actor.organizationId,
      role: "engineer",
      status: "active",
    };
  }

  async updateEmployee(actor: User, employeeId: string, body: EmployeeUpdate): Promise<Employee> {
    this.assertOwner(actor);
    const row = await this.loadActiveEngineerOrThrow(actor.organizationId, employeeId);

    if (body.email && body.email !== row.user.email) {
      await this.assertEmailAvailable(body.email);
    }

    const patch: { email?: string; name?: string; passwordHash?: string } = {};
    if (body.email !== undefined) {
      patch.email = body.email;
    }
    if (body.name !== undefined) {
      patch.name = body.name;
    }
    if (body.password !== undefined) {
      patch.passwordHash = await hashPassword(body.password);
    }

    await this.db.orm.public.User.where({ id: employeeId }).update(patch);

    return {
      id: employeeId,
      email: body.email ?? row.user.email,
      name: body.name ?? row.user.name,
      organizationId: actor.organizationId,
      role: "engineer",
      status: "active",
    };
  }

  async deleteEmployee(actor: User, employeeId: string): Promise<void> {
    this.assertOwner(actor);
    if (actor.id === employeeId) {
      throw new ForbiddenException({
        code: "forbidden",
        message: "Нельзя удалить собственную учётную запись",
      });
    }

    const row = await this.loadActiveEngineerOrThrow(actor.organizationId, employeeId);

    await this.db.transaction(async (tx) => {
      await tx.orm.public.Membership.where({ id: row.id }).update({ status: "disabled" });
      await tx.orm.public.User.where({ id: employeeId }).update({ status: "disabled" });
    });
    await this.sessions.revokeAllSessionsForUser(employeeId);
  }

  private assertOwner(user: User): void {
    if (user.role !== "owner") {
      throw new ForbiddenException({
        code: "forbidden",
        message: "Недостаточно прав для выполнения операции",
      });
    }
  }

  private async assertEmailAvailable(email: string): Promise<void> {
    const existing = await this.db.orm.public.User.where({ email }).first();
    if (existing) {
      throw new ConflictException({
        code: "conflict",
        message: "Пользователь с таким email уже существует",
      });
    }
  }

  private async loadActiveEngineerOrThrow(
    organizationId: string,
    employeeId: string,
  ): Promise<MembershipWithUser & { user: NonNullable<MembershipWithUser["user"]> }> {
    const row = await this.db.orm.public.Membership.where({
      organizationId,
      userId: employeeId,
      role: "engineer",
      status: "active",
    })
      .include("user")
      .first();

    if (!row?.user || row.user.status !== "active") {
      throw new NotFoundException({
        code: "not_found",
        message: "Сотрудник не найден",
      });
    }
    return {
      id: row.id,
      organizationId: row.organizationId,
      userId: row.userId,
      role: row.role,
      status: row.status,
      user: {
        id: row.user.id,
        email: row.user.email,
        name: row.user.name,
        status: row.user.status,
      },
    };
  }

  private toDto(row: MembershipWithUser & { user: NonNullable<MembershipWithUser["user"]> }): Employee {
    return {
      id: row.user.id,
      email: row.user.email,
      name: row.user.name,
      organizationId: row.organizationId,
      role: "engineer",
      status: "active",
    };
  }
}
