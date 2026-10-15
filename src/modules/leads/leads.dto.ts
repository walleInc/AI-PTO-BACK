import { UnprocessableEntityException } from "@nestjs/common";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type DemoLeadRequest = {
  email: string;
  company: string;
  phone: string;
  comment: string;
};

export type ContactLeadRequest = {
  name: string;
  email: string;
  message: string;
};

function asObject(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
}

function validationError(
  message: string,
  details: Array<{ field: string; message: string }>,
): never {
  throw new UnprocessableEntityException({
    code: "validation_error",
    message,
    details,
  });
}

function optionalString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseDemoLeadRequest(body: unknown): DemoLeadRequest {
  const obj = asObject(body);
  const details: Array<{ field: string; message: string }> = [];

  const email = optionalString(obj.email);
  if (!email || !EMAIL_RE.test(email)) {
    details.push({ field: "email", message: "Укажите корректный email" });
  }

  if (details.length > 0) {
    validationError("Некорректные данные заявки", details);
  }

  return {
    email,
    company: optionalString(obj.company),
    phone: optionalString(obj.phone),
    comment: optionalString(obj.comment),
  };
}

export function parseContactLeadRequest(body: unknown): ContactLeadRequest {
  const obj = asObject(body);
  const details: Array<{ field: string; message: string }> = [];

  const name = optionalString(obj.name);
  if (name.length < 2) {
    details.push({ field: "name", message: "Минимум 2 символа" });
  }

  const email = optionalString(obj.email);
  if (!email || !EMAIL_RE.test(email)) {
    details.push({ field: "email", message: "Укажите корректный email" });
  }

  const message = optionalString(obj.message);
  if (message.length < 10) {
    details.push({ field: "message", message: "Минимум 10 символов" });
  }

  if (details.length > 0) {
    validationError("Некорректные данные заявки", details);
  }

  return { name, email, message };
}
