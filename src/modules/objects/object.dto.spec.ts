import { BadRequestException } from "@nestjs/common";
import { parseObjectStatusChange, parseObjectWrite } from "./object.dto.js";

const TYPE_ID = "11111111-1111-4111-8111-111111111111";
const WORK_ID = "22222222-2222-4222-8222-222222222222";
const ORG_ID = "33333333-3333-4333-8333-333333333333";

function details(fn: () => unknown): Array<{ field: string; message: string }> {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    const response = (error as BadRequestException).getResponse() as {
      code: string;
      message: string;
      details: Array<{ field: string; message: string }>;
    };
    expect(response.code).toBe("validation_error");
    expect(response.message).toBeTruthy();
    return response.details;
  }
  throw new Error("expected BadRequestException");
}

describe("parseObjectWrite", () => {
  const valid = { code: " A-1 ", name: " Объект ", objectTypeId: TYPE_ID, workTypeIds: [WORK_ID] };

  it("trims strings and fills optional fields with null", () => {
    expect(parseObjectWrite(valid)).toEqual({
      code: "A-1",
      name: "Объект",
      objectTypeId: TYPE_ID,
      workTypeIds: [WORK_ID],
      address: null,
      description: null,
      customerOrganizationId: null,
      contractorOrganizationId: null,
      customerProfileId: null,
    });
  });

  it("accepts optional fields and treats empty strings as null", () => {
    const result = parseObjectWrite({
      ...valid,
      address: "г. Тест",
      description: "",
      customerOrganizationId: ORG_ID,
      contractorOrganizationId: "",
    });
    expect(result.address).toBe("г. Тест");
    expect(result.description).toBeNull();
    expect(result.customerOrganizationId).toBe(ORG_ID);
    expect(result.contractorOrganizationId).toBeNull();
  });

  it("allows an empty work type list", () => {
    expect(parseObjectWrite({ ...valid, workTypeIds: [] }).workTypeIds).toEqual([]);
  });

  it("reports every invalid field at once", () => {
    const result = details(() =>
      parseObjectWrite({
        code: "",
        name: "   ",
        objectTypeId: "x",
        workTypeIds: ["not-a-uuid"],
        customerOrganizationId: "x",
        address: 5,
      }),
    );
    expect(result.map((d) => d.field).sort()).toEqual(
      ["address", "code", "customerOrganizationId", "name", "objectTypeId", "workTypeIds"].sort(),
    );
  });

  it.each([[undefined], [null], ["text"], [[]]])("rejects non-object body %p", (body) => {
    const result = details(() => parseObjectWrite(body));
    expect(result.map((d) => d.field)).toEqual(expect.arrayContaining(["code", "name", "objectTypeId", "workTypeIds"]));
  });

  it("rejects workTypeIds that is not an array", () => {
    expect(details(() => parseObjectWrite({ ...valid, workTypeIds: WORK_ID }))).toEqual([
      { field: "workTypeIds", message: "Ожидается массив UUID" },
    ]);
  });
});

describe("parseObjectStatusChange", () => {
  it.each(["draft", "active", "on_hold", "completed"])("accepts %s", (status) => {
    expect(parseObjectStatusChange({ status })).toEqual({ status });
  });

  it.each([[{ status: "archived" }], [{ status: "unknown" }], [{}], [null], [{ status: 1 }]])("rejects %p", (body) => {
    expect(details(() => parseObjectStatusChange(body))[0].field).toBe("status");
  });
});
