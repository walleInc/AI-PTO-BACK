import { UnprocessableEntityException } from "@nestjs/common";
import { parseContactLeadRequest, parseDemoLeadRequest } from "./leads.dto.js";

describe("parseDemoLeadRequest", () => {
  it("принимает валидный email и опциональные поля", () => {
    expect(
      parseDemoLeadRequest({
        email: " user@example.com ",
        company: "ООО",
        phone: "+7",
        comment: "hi",
      }),
    ).toEqual({
      email: "user@example.com",
      company: "ООО",
      phone: "+7",
      comment: "hi",
    });
  });

  it("требует email", () => {
    expect(() => parseDemoLeadRequest({ company: "x" })).toThrow(
      UnprocessableEntityException,
    );
  });
});

describe("parseContactLeadRequest", () => {
  it("принимает валидное тело", () => {
    expect(
      parseContactLeadRequest({
        name: "Иван",
        email: "ivan@example.com",
        message: "Достаточно длинное сообщение",
      }),
    ).toEqual({
      name: "Иван",
      email: "ivan@example.com",
      message: "Достаточно длинное сообщение",
    });
  });

  it("отклоняет короткое имя и message", () => {
    expect(() =>
      parseContactLeadRequest({
        name: "И",
        email: "ivan@example.com",
        message: "коротко",
      }),
    ).toThrow(UnprocessableEntityException);
  });
});
