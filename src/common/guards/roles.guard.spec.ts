import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY, RolesGuard } from "./roles.guard.js";
import type { User } from "../dto/openapi.types.js";

function mockContext(user?: User) {
  const req: { user?: User } = { user };
  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  };
}

describe("RolesGuard", () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);

  beforeEach(() => {
    (reflector.getAllAndOverride as jest.Mock).mockReset();
  });

  const engineer: User = {
    id: "1",
    email: "eng@example.com",
    name: "Eng",
    organizationId: "org",
    role: "engineer",
  };

  const owner: User = { ...engineer, id: "2", email: "own@example.com", role: "owner" };

  it("allows any authenticated role when no @Roles metadata", () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    expect(guard.canActivate(mockContext(engineer) as never)).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, expect.any(Array));
  });

  it("forbids engineer on owner-only route", () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(["owner"]);
    expect(() => guard.canActivate(mockContext(engineer) as never)).toThrow(ForbiddenException);
  });

  it("allows owner on owner-only route", () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(["owner"]);
    expect(guard.canActivate(mockContext(owner) as never)).toBe(true);
  });

  it("forbids when user is missing", () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(["owner"]);
    expect(() => guard.canActivate(mockContext(undefined) as never)).toThrow(ForbiddenException);
  });
});
