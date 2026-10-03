import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type {
  ConstructionObject,
  Counterparty,
  ListObjectsQuery,
  ObjectStatus,
  ObjectStatusChange,
  ObjectType,
  ObjectWrite,
  User,
  WorkType,
} from "../../common/dto/openapi.types.js";
import { DB, type AppDb } from "../../prisma/db.token.js";
import { canTransitionObjectStatus, todayDateString } from "./object-status.js";

const ENTITY_TYPE = "construction_object";

type ObjectRow = Awaited<ReturnType<ObjectsService["loadObjectOrThrow"]>>;

@Injectable()
export class ObjectsService {
  constructor(@Inject(DB) private readonly db: AppDb) {}

  async listObjectTypes(): Promise<ObjectType[]> {
    const rows = await this.db.orm.public.ObjectType.where({ active: true })
      .include("group")
      .orderBy((t) => t.name.asc())
      .all();

    return rows
      .filter((row) => row.group?.active)
      .map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        group: {
          id: row.group.id,
          code: row.group.code,
          name: row.group.name,
        },
      }));
  }

  async listWorkTypes(): Promise<WorkType[]> {
    const rows = await this.db.orm.public.WorkType.where({ active: true })
      .orderBy((t) => t.name.asc())
      .all();
    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
    }));
  }

  async listCounterparties(): Promise<Counterparty[]> {
    const rows = await this.db.orm.public.Organization.where({
      kind: "counterparty",
      status: "active",
    })
      .orderBy((o) => o.name.asc())
      .all();

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
    }));
  }

  async listObjects(user: User, query: ListObjectsQuery): Promise<ConstructionObject[]> {
    const includeArchived = query.includeArchived === true || query.includeArchived === "true";

    let q = this.db.orm.public.ConstructionObject.where({
      organizationId: user.organizationId,
    });
    if (!includeArchived) {
      q = q.where((o) => o.status.neq("archived"));
    }

    const rows = await q
      .include("objectType", (ot) => ot.include("group"))
      .include("customerOrganization")
      .include("contractorOrganization")
      .include("workTypes", (links) => links.include("workType"))
      .orderBy((o) => o.name.asc())
      .all();

    return rows.map((row) => this.toDto(row));
  }

  async createObject(user: User, body: ObjectWrite): Promise<ConstructionObject> {
    await this.assertObjectType(body.objectTypeId);
    await this.assertWorkTypes(body.workTypeIds);
    await this.assertCounterparties(body.customerOrganizationId, body.contractorOrganizationId);
    await this.assertCodeAvailable(user.organizationId, body.code);

    const id = randomUUID();

    await this.db.transaction(async (tx) => {
      await tx.orm.public.ConstructionObject.create({
        id,
        organizationId: user.organizationId,
        objectTypeId: body.objectTypeId,
        customerOrganizationId: body.customerOrganizationId ?? null,
        contractorOrganizationId: body.contractorOrganizationId ?? null,
        customerProfileId: null,
        code: body.code,
        name: body.name,
        address: body.address ?? null,
        status: "draft",
        description: body.description ?? null,
        createdById: user.id,
      });

      for (const workTypeId of uniqueIds(body.workTypeIds)) {
        await tx.orm.public.ObjectWorkType.create({
          id: randomUUID(),
          objectId: id,
          workTypeId,
          status: "active",
        });
      }

      await this.writeAudit(tx, {
        organizationId: user.organizationId,
        actorId: user.id,
        action: "construction_object.create",
        entityId: id,
        payload: { code: body.code, name: body.name },
      });
    });

    return this.getObject(user, id);
  }

  async getObject(user: User, objectId: string): Promise<ConstructionObject> {
    const row = await this.loadObjectOrThrow(user.organizationId, objectId);
    return this.toDto(row);
  }

  async updateObject(user: User, objectId: string, body: ObjectWrite): Promise<ConstructionObject> {
    const existing = await this.loadObjectOrThrow(user.organizationId, objectId);
    if (existing.status === "archived") {
      throw new ConflictException({
        code: "conflict",
        message: "Архивный объект нельзя редактировать",
      });
    }

    await this.assertObjectType(body.objectTypeId);
    await this.assertWorkTypes(body.workTypeIds);
    await this.assertCounterparties(body.customerOrganizationId, body.contractorOrganizationId);
    await this.assertCodeAvailable(user.organizationId, body.code, objectId);

    await this.db.transaction(async (tx) => {
      await tx.orm.public.ConstructionObject.where({ id: objectId }).update({
        objectTypeId: body.objectTypeId,
        customerOrganizationId: body.customerOrganizationId ?? null,
        contractorOrganizationId: body.contractorOrganizationId ?? null,
        code: body.code,
        name: body.name,
        address: body.address ?? null,
        description: body.description ?? null,
      });

      await tx.orm.public.ObjectWorkType.where({ objectId }).delete();
      for (const workTypeId of uniqueIds(body.workTypeIds)) {
        await tx.orm.public.ObjectWorkType.create({
          id: randomUUID(),
          objectId,
          workTypeId,
          status: "active",
        });
      }

      await this.writeAudit(tx, {
        organizationId: user.organizationId,
        actorId: user.id,
        action: "construction_object.update",
        entityId: objectId,
        payload: { code: body.code, name: body.name },
      });
    });

    return this.getObject(user, objectId);
  }

  async changeStatus(
    user: User,
    objectId: string,
    body: ObjectStatusChange,
  ): Promise<ConstructionObject> {
    const existing = await this.loadObjectOrThrow(user.organizationId, objectId);
    const next = body.status;

    if (!canTransitionObjectStatus(existing.status, next)) {
      throw new ConflictException({
        code: "conflict",
        message: `Переход статуса ${existing.status} → ${next} запрещён`,
      });
    }

    const patch: {
      status: ObjectStatus;
      actualEndDate?: string | null;
    } = { status: next };

    if (next === "completed" && !existing.actualEndDate) {
      patch.actualEndDate = todayDateString();
    }

    await this.db.transaction(async (tx) => {
      await tx.orm.public.ConstructionObject.where({ id: objectId }).update(patch);
      await this.writeAudit(tx, {
        organizationId: user.organizationId,
        actorId: user.id,
        action: "construction_object.status_change",
        entityId: objectId,
        payload: { from: existing.status, to: next },
      });
    });

    return this.getObject(user, objectId);
  }

  async archiveObject(user: User, objectId: string): Promise<ConstructionObject> {
    if (user.role !== "owner") {
      throw new ForbiddenException({
        code: "forbidden",
        message: "Архивировать объект может только владелец организации",
      });
    }

    const existing = await this.loadObjectOrThrow(user.organizationId, objectId);
    if (existing.status === "archived") {
      throw new ConflictException({
        code: "conflict",
        message: "Объект уже архивирован",
      });
    }

    const archivedAt = new Date().toISOString();

    await this.db.transaction(async (tx) => {
      await tx.orm.public.ConstructionObject.where({ id: objectId }).update({
        status: "archived",
        archivedAt,
      });
      await this.writeAudit(tx, {
        organizationId: user.organizationId,
        actorId: user.id,
        action: "construction_object.archive",
        entityId: objectId,
        payload: { from: existing.status },
      });
    });

    return this.getObject(user, objectId);
  }

  private async loadObjectOrThrow(organizationId: string, objectId: string) {
    const row = await this.db.orm.public.ConstructionObject.where({
      id: objectId,
      organizationId,
    })
      .include("objectType", (ot) => ot.include("group"))
      .include("customerOrganization")
      .include("contractorOrganization")
      .include("workTypes", (links) => links.include("workType"))
      .first();

    if (!row) {
      throw new NotFoundException({
        code: "not_found",
        message: "Объект не найден",
      });
    }
    return row;
  }

  private toDto(row: ObjectRow): ConstructionObject {
    const objectType = row.objectType;
    if (!objectType?.group) {
      throw new NotFoundException({
        code: "not_found",
        message: "Объект не найден",
      });
    }

    return {
      id: row.id,
      code: row.code,
      name: row.name,
      address: row.address,
      status: row.status,
      description: row.description,
      objectType: {
        id: objectType.id,
        code: objectType.code,
        name: objectType.name,
        description: objectType.description,
        group: {
          id: objectType.group.id,
          code: objectType.group.code,
          name: objectType.group.name,
        },
      },
      customer: row.customerOrganization
        ? { id: row.customerOrganization.id, name: row.customerOrganization.name }
        : null,
      contractor: row.contractorOrganization
        ? { id: row.contractorOrganization.id, name: row.contractorOrganization.name }
        : null,
      workTypes: row.workTypes.map((link) => ({
        id: link.workType.id,
        code: link.workType.code,
        name: link.workType.name,
        description: link.workType.description,
      })),
      startDate: row.startDate,
      plannedEndDate: row.plannedEndDate,
      actualEndDate: row.actualEndDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      archivedAt: row.archivedAt,
    };
  }

  private async assertObjectType(objectTypeId: string): Promise<void> {
    const row = await this.db.orm.public.ObjectType.where({ id: objectTypeId, active: true }).first();
    if (!row) {
      throw new UnprocessableEntityException({
        code: "validation_error",
        message: "Тип объекта не найден или неактивен",
        details: [{ field: "objectTypeId", message: "invalid" }],
      });
    }
  }

  private async assertWorkTypes(workTypeIds: string[]): Promise<void> {
    const ids = uniqueIds(workTypeIds);
    if (ids.length === 0) {
      return;
    }
    const rows = await this.db.orm.public.WorkType.where((w) => w.id.in(ids))
      .where({ active: true })
      .all();
    if (rows.length !== ids.length) {
      throw new UnprocessableEntityException({
        code: "validation_error",
        message: "Один или несколько видов работ не найдены или неактивны",
        details: [{ field: "workTypeIds", message: "invalid" }],
      });
    }
  }

  private async assertCounterparties(
    customerOrganizationId?: string | null,
    contractorOrganizationId?: string | null,
  ): Promise<void> {
    await this.assertCounterparty(customerOrganizationId, "customerOrganizationId");
    await this.assertCounterparty(contractorOrganizationId, "contractorOrganizationId");
  }

  private async assertCounterparty(
    organizationId: string | null | undefined,
    field: string,
  ): Promise<void> {
    if (!organizationId) {
      return;
    }
    const row = await this.db.orm.public.Organization.where({
      id: organizationId,
      kind: "counterparty",
    }).first();
    if (!row) {
      throw new UnprocessableEntityException({
        code: "validation_error",
        message: "Заказчик и подрядчик должны быть организациями kind=counterparty",
        details: [{ field, message: "must be counterparty" }],
      });
    }
  }

  private async assertCodeAvailable(
    organizationId: string,
    code: string,
    excludeObjectId?: string,
  ): Promise<void> {
    const existing = await this.db.orm.public.ConstructionObject.where({
      organizationId,
      code,
    }).first();
    if (existing && existing.id !== excludeObjectId) {
      throw new ConflictException({
        code: "conflict",
        message: "Код объекта уже занят в этой организации",
        details: [{ field: "code", message: "already exists" }],
      });
    }
  }

  private async writeAudit(
    tx: { orm: AppDb["orm"] },
    input: {
      organizationId: string;
      actorId: string;
      action: string;
      entityId: string;
      payload?: { [key: string]: string | null };
    },
  ): Promise<void> {
    await tx.orm.public.AuditLog.create({
      id: randomUUID(),
      organizationId: input.organizationId,
      actorId: input.actorId,
      action: input.action,
      entityType: ENTITY_TYPE,
      entityId: input.entityId,
      payload: input.payload ?? null,
    });
  }
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}
