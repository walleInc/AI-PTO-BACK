import { BadRequestException } from "@nestjs/common";
import type { ObjectStatusChange, ObjectWrite } from "../../common/dto/openapi.types.js";

type Detail = { field: string; message: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS_CHANGE_VALUES = ["draft", "active", "on_hold", "completed"] as const;

function asObject(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}

function validationError(message: string, details: Detail[]): never {
  throw new BadRequestException({
    code: "validation_error",
    message,
    details,
  });
}

function requiredString(obj: Record<string, unknown>, field: string, details: Detail[]): string {
  const raw = obj[field];
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) {
    details.push({ field, message: "Обязательное поле" });
  }
  return value;
}

function requiredUuid(obj: Record<string, unknown>, field: string, details: Detail[]): string {
  const value = obj[field];
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    details.push({ field, message: "Ожидается UUID" });
    return "";
  }
  return value;
}

/** Необязательная строка: отсутствие, null и пустая строка дают null. */
function optionalString(obj: Record<string, unknown>, field: string, details: Detail[]): string | null {
  const value = obj[field];
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string") {
    details.push({ field, message: "Ожидается строка" });
    return null;
  }
  return value.trim() || null;
}

/** Необязательный UUID: отсутствие, null и пустая строка дают null. */
function optionalUuid(obj: Record<string, unknown>, field: string, details: Detail[]): string | null {
  const value = obj[field];
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    details.push({ field, message: "Ожидается UUID" });
    return null;
  }
  return value;
}

export function parseObjectWrite(body: unknown): ObjectWrite {
  const obj = asObject(body);
  const details: Detail[] = [];

  const code = requiredString(obj, "code", details);
  const name = requiredString(obj, "name", details);
  const objectTypeId = requiredUuid(obj, "objectTypeId", details);

  let workTypeIds: string[] = [];
  if (!Array.isArray(obj.workTypeIds)) {
    details.push({ field: "workTypeIds", message: "Ожидается массив UUID" });
  } else if (!obj.workTypeIds.every((id) => typeof id === "string" && UUID_RE.test(id))) {
    details.push({ field: "workTypeIds", message: "Все элементы должны быть UUID" });
  } else {
    workTypeIds = obj.workTypeIds as string[];
  }

  const address = optionalString(obj, "address", details);
  const description = optionalString(obj, "description", details);
  const customerOrganizationId = optionalUuid(obj, "customerOrganizationId", details);
  const contractorOrganizationId = optionalUuid(obj, "contractorOrganizationId", details);
  const customerProfileId = optionalUuid(obj, "customerProfileId", details);

  if (details.length > 0) {
    validationError("Некорректные данные объекта", details);
  }

  return {
    code,
    name,
    objectTypeId,
    workTypeIds,
    address,
    description,
    customerOrganizationId,
    contractorOrganizationId,
    customerProfileId,
  };
}

export function parseObjectStatusChange(body: unknown): ObjectStatusChange {
  const status = asObject(body).status;
  if (typeof status !== "string" || !(STATUS_CHANGE_VALUES as readonly string[]).includes(status)) {
    validationError("Некорректный статус объекта", [
      { field: "status", message: `Допустимые значения: ${STATUS_CHANGE_VALUES.join(", ")}` },
    ]);
  }
  return { status: status as ObjectStatusChange["status"] };
}
