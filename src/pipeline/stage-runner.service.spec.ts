import { StageRunnerService } from "./stage-runner.service.js";

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

describe("StageRunnerService", () => {
  const documentId = "doc-1";
  const packageId = "pkg-1";

  it("does not create a second DocumentStageRun when stage already succeeded", async () => {
    const document = chainable({ id: documentId, packageId, status: "processing" });
    const stageRun = chainable([{ id: "run-1", status: "succeeded", attempt: 1 }]);
    const db = {
      orm: {
        public: {
          Document: document,
          DocumentStageRun: stageRun,
        },
      },
    };
    const queue = { enqueueStage: jest.fn(() => Promise.resolve()) };
    const packageProgress = {
      markPackageProcessing: jest.fn(() => Promise.resolve()),
      refreshPackageStatus: jest.fn(() => Promise.resolve()),
    };

    const service = new StageRunnerService(db as never, queue as never, packageProgress as never);
    await service.processStage("extract", documentId, packageId);

    expect(stageRun.create).not.toHaveBeenCalled();
    expect(queue.enqueueStage).toHaveBeenCalledWith("ocr", documentId, packageId);
  });

  it("creates a stub succeeded run and enqueues the next stage", async () => {
    const document = chainable({ id: documentId, packageId, status: "queued" });
    const stageRun = chainable([]);
    const db = {
      orm: {
        public: {
          Document: document,
          DocumentStageRun: stageRun,
        },
      },
    };
    const queue = { enqueueStage: jest.fn(() => Promise.resolve()) };
    const packageProgress = {
      markPackageProcessing: jest.fn(() => Promise.resolve()),
      refreshPackageStatus: jest.fn(() => Promise.resolve()),
    };

    const service = new StageRunnerService(db as never, queue as never, packageProgress as never);
    await service.processStage("extract", documentId, packageId);

    expect(stageRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId,
        stage: "extract",
        status: "running",
        attempt: 1,
      }),
    );
    expect(stageRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "succeeded",
        outputVersion: "stub-v1",
      }),
    );
    expect(document.update).toHaveBeenCalledWith({ status: "processing" });
    expect(queue.enqueueStage).toHaveBeenCalledWith("ocr", documentId, packageId);
  });

  it("marks ocr as skipped and continues the pipeline", async () => {
    const document = chainable({ id: documentId, packageId, status: "processing" });
    const stageRun = chainable([]);
    const db = {
      orm: {
        public: {
          Document: document,
          DocumentStageRun: stageRun,
        },
      },
    };
    const queue = { enqueueStage: jest.fn(() => Promise.resolve()) };
    const packageProgress = {
      markPackageProcessing: jest.fn(() => Promise.resolve()),
      refreshPackageStatus: jest.fn(() => Promise.resolve()),
    };

    const service = new StageRunnerService(db as never, queue as never, packageProgress as never);
    await service.processStage("ocr", documentId, packageId);

    expect(stageRun.update).toHaveBeenCalledWith(expect.objectContaining({ status: "skipped" }));
    expect(queue.enqueueStage).toHaveBeenCalledWith("classify", documentId, packageId);
  });

  it("marks document done after the last stage", async () => {
    const document = chainable({ id: documentId, packageId, status: "processing" });
    const stageRun = chainable([]);
    const db = {
      orm: {
        public: {
          Document: document,
          DocumentStageRun: stageRun,
        },
      },
    };
    const queue = { enqueueStage: jest.fn(() => Promise.resolve()) };
    const packageProgress = {
      markPackageProcessing: jest.fn(() => Promise.resolve()),
      refreshPackageStatus: jest.fn(() => Promise.resolve()),
    };

    const service = new StageRunnerService(db as never, queue as never, packageProgress as never);
    await service.processStage("explain", documentId, packageId);

    expect(queue.enqueueStage).not.toHaveBeenCalled();
    expect(document.update).toHaveBeenCalledWith({ status: "done" });
    expect(packageProgress.refreshPackageStatus).toHaveBeenCalledWith(packageId);
  });
});
