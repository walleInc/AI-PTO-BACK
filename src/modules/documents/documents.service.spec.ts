import { NotFoundException } from "@nestjs/common";
import type { User } from "../../common/dto/openapi.types.js";
import type { StorageService } from "../storage/storage.service.js";
import { DocumentsService } from "./documents.service.js";

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
  api.delete = jest.fn(() => Promise.resolve({ affectedRows: 1 }));
  return api;
}

type MockChain = ReturnType<typeof chainable>;
type MockDb = {
  orm: { public: Record<string, MockChain> };
  transaction: (fn: (tx: MockDb) => Promise<unknown>) => Promise<unknown>;
};

describe("DocumentsService", () => {
  const user: User = {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    email: "eng@example.com",
    name: "Engineer",
    organizationId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    role: "engineer",
  };

  const documentId = "33333333-3333-3333-3333-333333333333";

  let document: MockChain;
  let fileAsset: MockChain;
  let pkg: MockChain;
  let finding: MockChain;
  let findingSource: MockChain;
  let findingHistory: MockChain;
  let sourceRef: MockChain;
  let extractedField: MockChain;
  let documentStageRun: MockChain;
  let checklistItemDocument: MockChain;
  let db: MockDb;
  let storage: jest.Mocked<Pick<StorageService, "presignGet" | "deleteObject">>;
  let service: DocumentsService;

  beforeEach(() => {
    document = chainable(null);
    fileAsset = chainable(null);
    pkg = chainable({ id: "pkg-1", documentsCount: 2 });
    finding = chainable([]);
    findingSource = chainable(null);
    findingHistory = chainable(null);
    sourceRef = chainable([]);
    extractedField = chainable(null);
    documentStageRun = chainable(null);
    checklistItemDocument = chainable(null);

    db = {
      orm: {
        public: {
          Document: document,
          FileAsset: fileAsset,
          Package: pkg,
          Finding: finding,
          FindingSource: findingSource,
          FindingHistory: findingHistory,
          SourceRef: sourceRef,
          ExtractedField: extractedField,
          DocumentStageRun: documentStageRun,
          ChecklistItemDocument: checklistItemDocument,
        },
      },
      transaction: jest.fn(async (fn) => fn(db)),
    };

    storage = {
      presignGet: jest.fn((_key: string) =>
        Promise.resolve({
          url: "https://storage.example/get",
          expiresAt: "2026-01-01T00:15:00.000Z",
        }),
      ),
      deleteObject: jest.fn((_key: string) => Promise.resolve()),
    };

    service = new DocumentsService(db as never, storage as never);
  });

  it("returns 404 for document outside organization", async () => {
    document.first.mockResolvedValue(null);
    await expect(service.getDocumentFile(user, documentId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("returns presigned file url", async () => {
    document.first.mockResolvedValue({
      id: documentId,
      packageId: "pkg-1",
      fileAssetId: "asset-1",
      object: { organizationId: user.organizationId },
      fileAsset: { objectKey: "org/obj/pkg/doc/a.pdf", sizeBytes: 10 },
    });

    await expect(service.getDocumentFile(user, documentId)).resolves.toEqual({
      url: "https://storage.example/get",
      expiresAt: "2026-01-01T00:15:00.000Z",
    });
  });

  it("deletes document and shared asset stays in S3", async () => {
    document.first
      .mockResolvedValueOnce({
        id: documentId,
        packageId: "pkg-1",
        fileAssetId: "asset-1",
        object: { organizationId: user.organizationId },
        fileAsset: { objectKey: "k", sizeBytes: 10 },
      })
      // other document still references the asset inside transaction
      .mockResolvedValueOnce({ id: "other-doc", fileAssetId: "asset-1" });

    await service.deleteDocument(user, documentId);

    expect(storage.deleteObject).not.toHaveBeenCalled();
    expect(fileAsset.delete).not.toHaveBeenCalled();
    expect(pkg.update).toHaveBeenCalledWith({ documentsCount: 1 });
  });

  it("deletes orphan file asset and object from storage", async () => {
    document.first
      .mockResolvedValueOnce({
        id: documentId,
        packageId: "pkg-1",
        fileAssetId: "asset-1",
        object: { organizationId: user.organizationId },
        fileAsset: { objectKey: "k", sizeBytes: 10 },
      })
      .mockResolvedValueOnce(null);

    await service.deleteDocument(user, documentId);

    expect(fileAsset.delete).toHaveBeenCalled();
    expect(storage.deleteObject).toHaveBeenCalledWith("k");
  });
});
