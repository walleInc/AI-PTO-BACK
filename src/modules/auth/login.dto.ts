import { BadRequestException } from "@nestjs/common";
import type { LoginRequest } from "../../common/dto/openapi.types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseLoginRequest(body: unknown): LoginRequest {
  const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const details: Array<{ field: string; message: string }> = [];

  const email = typeof obj.email === "string" ? obj.email.trim() : "";
  if (!email || !EMAIL_RE.test(email)) {
    details.push({ field: "email", message: "Укажите корректный email" });
  }
  const password = typeof obj.password === "string" ? obj.password : "";
  if (!password) {
    details.push({ field: "password", message: "Обязательное поле" });
  }

  if (details.length > 0) {
    throw new BadRequestException({
      code: "validation_error",
      message: "Некорректные данные для входа",
      details,
    });
  }
  return { email, password };
}
