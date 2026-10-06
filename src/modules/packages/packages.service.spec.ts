import {
  ConflictException,
  NotFoundException,
  PayloadTooLargeException,
  UnprocessableEntityException,
  UnsupportedMediaTypeException,
} from "@nestjs/common";
import type { User } from "../../common/dto/openapi.types.js";
import type { StorageService } from "../storage/storage.service.js";
import { PackagesService } from "./packages.service.js";

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

describe("PackagesService", () => {
  const user: User = {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    email: "eng@example.com",
    name: "Engineer",
    organizationId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    role: "engineer",
  };

  const objectId = "11111111-1111-1111-1111-111111111111";
  const packageId = "22222222-2222-2222-2222-222222222222";

  let constructionObject: MockChain;
  let pkg: MockChain;
  let document: MockChain;
  let fileAsset: MockChain;
  let documentType: MockChain;
  let db: MockDb;
  let storage: jest.Mocked<
    Pick<StorageService, "presignPut" | "objectExists" | "bucket" | "maxFileBytes" | "storageProvider">
  >;
  let service: PackagesService;

  beforeEach(() => {
    constructionObject = chainable({ id: objectId, organizationId: user.organizationId });
    pkg = chainable(null);
    document = chainable([]);
    fileAsset = chainable(null);
    documentType = chainable({ id: "dtype-unknown", code: "unknown" });

    db = {
      orm: {
        public: {
          ConstructionObject: constructionObject,
          Package: pkg,
          Document: document,
          FileAsset: fileAsset,
          DocumentType: documentType,
        },
      },
      transaction: jest.fn(async (fn) => fn(db)),
    };

    storage = {
      bucket: "pto-doc",
      maxFileBytes: 1000,
      storageProvider: "yandex",
      presignPut: jest.fn((_key: string, _contentType: string) =>
        Promise.resolve({
          url: "https://storage.example/put",
          headers: { "Content-Type": "application/pdf" },
          expiresAt: "2026-01-01T00:15:00.000Z",
        }),
      ),
      objectExists: jest.fn((_key: string) => Promise.resolve(true)),
    };

    service = new PackagesService(db as never, storage as never);
  });

  it("returns 404 for object outside organization", async () => {
    constructionObject.first.mockResolvedValue(null);
    await expect(service.listPackages(user, objectId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects empty files with 422", async () => {
    await expect(service.createPackage(user, objectId, { files: [] })).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it("rejects unsupported mime with 415", async () => {
    await expect(
      service.createPackage(user, objectId, {
        files: [{ fileName: "a.bin", mimeType: "application/octet-stream", sizeBytes: 10 }],
      }),
    ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
  });

  it("rejects oversized file with 413", async () => {
    await expect(
      service.createPackage(user, objectId, {
        files: [{ fileName: "a.pdf", mimeType: "application/pdf", sizeBytes: 1001 }],
      }),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
  });

  it("creates package with presigned upload and keeps files order", async () => {
    pkg.first.mockResolvedValue(null);
    fileAsset.first.mockResolvedValue(null);

    const result = await service.createPackage(user, objectId, {
      files: [
        { fileName: "a.pdf", mimeType: "application/pdf", sizeBytes: 10 },
        { fileName: "b.csv", mimeType: "text/csv", sizeBytes: 20 },
      ],
    });

    expect(result.uploads).toHaveLength(2);
    expect(result.uploads[0]?.fileName).toBe("a.pdf");
    expect(result.uploads[1]?.fileName).toBe("b.csv");
    expect(result.uploads[0]?.uploadUrl).toBe("https://storage.example/put");
    expect(result.uploads[0]?.headers).toEqual({ "Content-Type": "application/pdf" });
    expect(result.package.status).toBe("uploading");
    expect(storage.presignPut).toHaveBeenCalledTimes(2);
  });

  it("marks sha256 duplicate with null uploadUrl", async () => {
    const sha = "a".repeat(64);
    pkg.first.mockResolvedValue(null);
    fileAsset.first.mockResolvedValue({
      id: "asset-1",
      organizationId: user.organizationId,
      sha256: sha,
    });
    document.first.mockResolvedValue({ id: "doc-original", fileAssetId: "asset-1" });

    const result = await service.createPackage(user, objectId, {
      files: [{ fileName: "a.pdf", mimeType: "application/pdf", sizeBytes: 10, sha256: sha }],
    });

    expect(result.uploads[0]?.uploadUrl).toBeNull();
    expect(result.uploads[0]?.duplicateOf).toBe("doc-original");
    expect(storage.presignPut).not.toHaveBeenCalled();
  });

  it("returns 409 when start called before upload", async () => {
    pkg.first.mockResolvedValue({
      id: packageId,
      objectId,
      version: 1,
      status: "uploading",
      progress: 0,
      documentsCount: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      finishedAt: null,
      object: { organizationId: user.organizationId },
      documents: [
        {
          id: "doc-1",
          status: "awaiting_upload",
          fileAssetId: "asset-1",
          fileAsset: { objectKey: "k", sizeBytes: 10 },
        },
      ],
    });
    storage.objectExists.mockResolvedValue(false);

    await expect(service.startPackage(user, packageId)).rejects.toBeInstanceOf(ConflictException);
  });

  it("queues package on start and is idempotent afterwards", async () => {
    const uploading = {
      id: packageId,
      objectId,
      version: 1,
      status: "uploading" as const,
      progress: 0,
      documentsCount: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      finishedAt: null,
      object: { organizationId: user.organizationId },
      documents: [
        {
          id: "doc-1",
          status: "awaiting_upload",
          fileAssetId: "asset-1",
          fileAsset: { objectKey: "k", sizeBytes: 10 },
        },
      ],
    };
    const queued = {
      ...uploading,
      status: "queued" as const,
      documents: [{ ...uploading.documents[0], status: "queued" }],
    };

    pkg.first.mockResolvedValueOnce(uploading).mockResolvedValueOnce(queued).mockResolvedValueOnce(queued);

    const first = await service.startPackage(user, packageId);
    expect(first.status).toBe("queued");

    const second = await service.startPackage(user, packageId);
    expect(second.status).toBe("queued");
    expect(db.transaction).toHaveBeenCalledTimes(1);
  });
});
