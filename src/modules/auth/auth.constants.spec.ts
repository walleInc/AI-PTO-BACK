import { postLoginRedirectUrl } from "./auth.constants";

describe("postLoginRedirectUrl", () => {
  const previous = process.env.FRONTEND_ORIGIN;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.FRONTEND_ORIGIN;
    } else {
      process.env.FRONTEND_ORIGIN = previous;
    }
  });

  it("defaults to the local SPA dashboard", () => {
    delete process.env.FRONTEND_ORIGIN;
    expect(postLoginRedirectUrl()).toBe("http://localhost:5173/dashboard");
  });

  it("appends /dashboard to FRONTEND_ORIGIN", () => {
    process.env.FRONTEND_ORIGIN = "http://localhost:5173/";
    expect(postLoginRedirectUrl()).toBe("http://localhost:5173/dashboard");
  });
});
