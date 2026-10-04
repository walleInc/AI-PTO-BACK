import { BadRequestException } from "@nestjs/common";
import { parseEmployeeCreate, parseEmployeeUpdate } from "./employee.dto.js";

describe("employee.dto", () => {
  it("parses create payload and normalizes email", () => {
    expect(
      parseEmployeeCreate({
        email: "  Eng@Example.com ",
        name: "  Ivan ",
        password: "password1",
      }),
    ).toEqual({
      email: "eng@example.com",
      name: "Ivan",
      password: "password1",
    });
  });

  it("rejects short password on create", () => {
    expect(() =>
      parseEmployeeCreate({
        email: "a@b.co",
        name: "A",
        password: "short",
      }),
    ).toThrow(BadRequestException);
  });

  it("requires at least one field on update", () => {
    expect(() => parseEmployeeUpdate({})).toThrow(BadRequestException);
  });

  it("parses partial update", () => {
    expect(parseEmployeeUpdate({ name: " New Name " })).toEqual({ name: "New Name" });
  });
});
