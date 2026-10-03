import { BadRequestException } from "@nestjs/common";
import { parseLoginRequest } from "./login.dto.js";

describe("parseLoginRequest", () => {
  it("accepts valid input and trims email", () => {
    expect(parseLoginRequest({ email: " a@b.co ", password: "p" })).toEqual({
      email: "a@b.co",
      password: "p",
    });
  });

  it.each([undefined, null, {}, { email: "bad", password: "p" }, { email: "a@b.co", password: "" }])(
    "rejects %j with validation_error",
    (body) => {
      expect(() => parseLoginRequest(body)).toThrow(BadRequestException);
    },
  );
});
