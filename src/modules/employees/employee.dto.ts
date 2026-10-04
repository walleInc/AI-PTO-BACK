import { BadRequestException } from "@nestjs/common";
import type { EmployeeCreate, EmployeeUpdate } from "../../common/dto/openapi.types.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function asObject(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
}

function validationError(message: string, details: Array<{ field: string; message: string }>): never {
  throw new BadRequestException({
    code: "validation_error",
    message,
    details,
  });
}

export function parseEmployeeCreate(body: unknown): EmployeeCreate {
  const obj = asObject(body);
  const details: Array<{ field: string; message: string }> = [];

  const email = typeof obj.email === "string" ? obj.email.trim().toLowerCase() : "";
  if (!email || !EMAIL_RE.test(email)) {
    details.push({ field: "email", message: "Укажите корректный email" });
  }

  const name = typeof obj.name === "string" ? obj.name.trim() : "";
  if (!name) {
    details.push({ field: "name", message: "Обязательное поле" });
  }

  const password = typeof obj.password === "string" ? obj.password : "";
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    details.push({
      field: "password",
      message: `Пароль не короче ${MIN_PASSWORD_LENGTH} символов`,
    });
  }

  if (details.length > 0) {
    validationError("Некорректные данные сотрудника", details);
  }
  return { email, name, password };
}

export function parseEmployeeUpdate(body: unknown): EmployeeUpdate {
  const obj = asObject(body);
  const details: Array<{ field: string; message: string }> = [];
  const result: EmployeeUpdate = {};

  if ("email" in obj) {
    const email = typeof obj.email === "string" ? obj.email.trim().toLowerCase() : "";
    if (!email || !EMAIL_RE.test(email)) {
      details.push({ field: "email", message: "Укажите корректный email" });
    } else {
      result.email = email;
    }
  }

  if ("name" in obj) {
    const name = typeof obj.name === "string" ? obj.name.trim() : "";
    if (!name) {
      details.push({ field: "name", message: "Имя не может быть пустым" });
    } else {
      result.name = name;
    }
  }

  if ("password" in obj) {
    const password = typeof obj.password === "string" ? obj.password : "";
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      details.push({
        field: "password",
        message: `Пароль не короче ${MIN_PASSWORD_LENGTH} символов`,
      });
    } else {
      result.password = password;
    }
  }

  if (details.length > 0) {
    validationError("Некорректные данные сотрудника", details);
  }
  if (result.email === undefined && result.name === undefined && result.password === undefined) {
    validationError("Некорректные данные сотрудника", [
      { field: "body", message: "Укажите хотя бы одно поле для изменения" },
    ]);
  }
  return result;
}
