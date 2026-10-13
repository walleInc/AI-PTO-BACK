import { PackageProgressService } from "./package-progress.service.js";

function chainable(result: unknown) {
  const api: Record<string, jest.Mock> = {};
  const self = () => api;
  for (const method of ["where", "include", "orderBy", "select", "all", "first", "create", "update", "delete"]) {
    api[method] = jest.fn(self);
  }
  api.all = jest.fn(() => Promise.resolve(Array.isArray(result) ? result : []));
  api.first = jest.fn(() => Promise.resolve(Array.isArray(result) ? (result[0] ?? null) : result));
  api.create = jest.fn((row: unknown) => Promise.resolve(row));
  api.update = jest.fn((row: unknown) => Promise.resolve(row));
  return api;
}

describe("PackageProgressService", () => {
  const packageId = "22222222-2222-2222-2222-222222222222";

  it("sets package done when all documents are done", async () => {
    const pkg = chainable({
      id: packageId,
      status: "processing",
      finishedAt: null,
      documents: [
        {
          status: "done",
          stageRuns: [
            { stage: "extract", status: "succeeded", attempt: 1 },
            { stage: "ocr", status: "skipped", attempt: 1 },
            { stage: "classify", status: "succeeded", attempt: 1 },
            { stage: "parse", status: "succeeded", attempt: 1 },
            { stage: "rules", status: "succeeded", attempt: 1 },
            { stage: "explain", status: "succeeded", attempt: 1 },
          ],
        },
      ],
    });
    const db = { orm: { public: { Package: pkg } } };
    const service = new PackageProgressService(db as never);

    await service.refreshPackageStatus(packageId);

    expect(pkg.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "done",
        progress: expect.anything(),
        finishedAt: expect.any(String),
      }),
    );
  });

  it("sets package partial when some documents failed", async () => {
    const pkg = chainable({
      id: packageId,
      status: "processing",
      finishedAt: null,
      documents: [
        { status: "done", stageRuns: [] },
        { status: "failed", stageRuns: [] },
      ],
    });
    const db = { orm: { public: { Package: pkg } } };
    const service = new PackageProgressService(db as never);

    await service.refreshPackageStatus(packageId);

    expect(pkg.update).toHaveBeenCalledWith(expect.objectContaining({ status: "partial" }));
  });

  it("sets package failed when every document failed", async () => {
    const pkg = chainable({
      id: packageId,
      status: "processing",
      finishedAt: null,
      documents: [
        { status: "failed", stageRuns: [] },
        { status: "failed", stageRuns: [] },
      ],
    });
    const db = { orm: { public: { Package: pkg } } };
    const service = new PackageProgressService(db as never);

    await service.refreshPackageStatus(packageId);

    expect(pkg.update).toHaveBeenCalledWith(expect.objectContaining({ status: "failed" }));
  });
});
