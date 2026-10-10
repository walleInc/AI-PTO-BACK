import {
  ConflictException,
  Inject,
  Injectable,
  MessageEvent,
  NotFoundException,
  NotImplementedException,
  PayloadTooLargeException,
  UnprocessableEntityException,
  UnsupportedMediaTypeException,
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import type { Char, Numeric } from "@prisma/orm-postgres/target/codec-types";
import type { Observable } from "rxjs";
import type {
  Package,
  PackageCreate,
  PackageCreated,
  PackageDetail,
  PackageStatus,
  Report,
  ReportCreate,
  User,
} from "../../common/dto/openapi.types.js";
import { DB, type AppDb } from "../../prisma/db.token.js";
import { StorageService } from "../storage/storage.service.js";
import { sanitizeFileName, toDocumentDto, toPackageDto } from "./package.mapper.js";

function asSha256(value: string): Char<64> {
  return value as Char<64>;
}

function asProgress(value: number): Numeric<5, 2> {
  return String(value) as unknown as Numeric<5, 2>;
}

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
]);

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const MIN_FILES = 1;
const MAX_FILES = 200;

const TERMINAL_OR_QUEUED: ReadonlySet<PackageStatus> = new Set(["queued", "processing", "done", "partial", "failed"]);

@Injectable()
export class PackagesService {
  constructor(
    @Inject(DB) private readonly db: AppDb,
    private readonly storage: StorageService,
  ) {}

  async listPackages(user: User, objectId: string): Promise<Package[]> {
    await this.loadObjectOrThrow(user.organizationId, objectId);

    const rows = await this.db.orm.public.Package.where({ objectId })
      .orderBy((p) => p.createdAt.desc())
      .all();

    return rows.map((row) => toPackageDto(row));
  }

  async createPackage(user: User, objectId: string, body: PackageCreate): Promise<PackageCreated> {
    await this.loadObjectOrThrow(user.organizationId, objectId);
    this.validateCreateBody(body);

    const unknownType = await this.db.orm.public.DocumentType.where({ code: "unknown" }).first();
    if (!unknownType) {
      throw new UnprocessableEntityException({
        code: "validation_error",
        message: "Справочник типов документов не инициализирован",
      });
    }

    const packageId = randomUUID();
    const now = new Date().toISOString();
    type UploadPlan =
      | {
          kind: "duplicate";
          documentId: string;
          fileName: string;
          duplicateOf: string | null;
        }
      | {
          kind: "upload";
          documentId: string;
          fileName: string;
          mimeType: string;
          objectKey: string;
        };

    const plans: UploadPlan[] = [];
    let packageRow: Parameters<typeof toPackageDto>[0] | null = null;

    await this.db.transaction(async (tx) => {
      const latest = await tx.orm.public.Package.where({ objectId })
        .orderBy((p) => p.version.desc())
        .first();
      const version = (latest?.version ?? 0) + 1;

      await tx.orm.public.Package.create({
        id: packageId,
        objectId,
        version,
        status: "uploading",
        progress: asProgress(0),
        documentsCount: body.files.length,
        createdById: user.id,
        createdAt: now,
        finishedAt: null,
      });

      for (const file of body.files) {
        const documentId = randomUUID();
        const sha256 = asSha256(file.sha256 ?? provisionalSha256(documentId));

        const existingAsset = file.sha256
          ? await tx.orm.public.FileAsset.where({
              organizationId: user.organizationId,
              sha256: asSha256(file.sha256),
            }).first()
          : null;

        if (existingAsset) {
          const originalDoc = await tx.orm.public.Document.where({ fileAssetId: existingAsset.id })
            .orderBy((d) => d.createdAt.asc())
            .first();

          await tx.orm.public.Document.create({
            id: documentId,
            objectId,
            packageId,
            fileAssetId: existingAsset.id,
            documentTypeId: unknownType.id,
            fileName: file.fileName,
            mimeType: file.mimeType,
            typeConfidence: null,
            typeEditedManually: false,
            status: "uploaded",
            createdAt: now,
          });

          plans.push({
            kind: "duplicate",
            documentId,
            fileName: file.fileName,
            duplicateOf: originalDoc?.id ?? null,
          });
          continue;
        }

        const fileAssetId = randomUUID();
        const objectKey = [user.organizationId, objectId, packageId, documentId, sanitizeFileName(file.fileName)].join(
          "/",
        );

        await tx.orm.public.FileAsset.create({
          id: fileAssetId,
          organizationId: user.organizationId,
          storageProvider: this.storage.storageProvider,
          bucket: this.storage.bucket,
          objectKey,
          originalFileName: file.fileName,
          mimeType: file.mimeType,
          sizeBytes: BigInt(file.sizeBytes),
          sha256,
          uploadedAt: now,
          checksumVerified: false,
          duplicateOfId: null,
        });

        await tx.orm.public.Document.create({
          id: documentId,
          objectId,
          packageId,
          fileAssetId,
          documentTypeId: unknownType.id,
          fileName: file.fileName,
          mimeType: file.mimeType,
          typeConfidence: null,
          typeEditedManually: false,
          status: "awaiting_upload",
          createdAt: now,
        });

        plans.push({
          kind: "upload",
          documentId,
          fileName: file.fileName,
          mimeType: file.mimeType,
          objectKey,
        });
      }

      packageRow = {
        id: packageId,
        objectId,
        version,
        status: "uploading",
        progress: 0,
        documentsCount: body.files.length,
        createdAt: now,
        finishedAt: null,
      };
    });

    const uploads: PackageCreated["uploads"] = [];
    for (const plan of plans) {
      if (plan.kind === "duplicate") {
        uploads.push({
          documentId: plan.documentId,
          fileName: plan.fileName,
          uploadUrl: null,
          headers: {},
          expiresAt: now,
          duplicateOf: plan.duplicateOf,
        });
        continue;
      }

      const signed = await this.storage.presignPut(plan.objectKey, plan.mimeType);
      uploads.push({
        documentId: plan.documentId,
        fileName: plan.fileName,
        uploadUrl: signed.url,
        headers: signed.headers,
        expiresAt: signed.expiresAt,
        duplicateOf: null,
      });
    }

    return {
      package: toPackageDto(packageRow!),
      uploads,
    };
  }

  async getPackage(user: User, packageId: string): Promise<PackageDetail> {
    const row = await this.loadPackageDetailOrThrow(user.organizationId, packageId);
    return {
      ...toPackageDto(row),
      documents: row.documents.map((doc) => toDocumentDto(doc)),
    };
  }

  async startPackage(user: User, packageId: string): Promise<Package> {
    const pkg = await this.loadPackageWithDocsOrThrow(user.organizationId, packageId);

    if (TERMINAL_OR_QUEUED.has(pkg.status)) {
      return toPackageDto(pkg);
    }

    for (const doc of pkg.documents) {
      if (doc.status !== "awaiting_upload") {
        continue;
      }
      const asset = doc.fileAsset;
      if (!asset) {
        throw new ConflictException({
          code: "conflict",
          message: "Не все файлы загружены",
        });
      }
      const exists = await this.storage.objectExists(asset.objectKey);
      if (!exists) {
        throw new ConflictException({
          code: "conflict",
          message: "Не все файлы загружены",
        });
      }
    }

    await this.db.transaction(async (tx) => {
      for (const doc of pkg.documents) {
        if (doc.status === "awaiting_upload" && doc.fileAssetId) {
          await tx.orm.public.FileAsset.where({ id: doc.fileAssetId }).update({
            checksumVerified: true,
          });
          await tx.orm.public.Document.where({ id: doc.id }).update({
            status: "queued",
          });
        } else if (doc.status === "uploaded") {
          await tx.orm.public.Document.where({ id: doc.id }).update({
            status: "queued",
          });
        }
      }

      await tx.orm.public.Package.where({ id: packageId }).update({
        status: "queued",
      });
    });

    const updated = await this.loadPackageWithDocsOrThrow(user.organizationId, packageId);
    return toPackageDto(updated);
  }

  streamPackageEvents(_packageId: string): Observable<MessageEvent> {
    throw new NotImplementedException("streamPackageEvents is not implemented");
  }

  createReport(_packageId: string, _body: ReportCreate): Promise<Report> {
    throw new NotImplementedException("createReport is not implemented");
  }

  private validateCreateBody(body: PackageCreate): void {
    if (!body || !Array.isArray(body.files)) {
      throw new UnprocessableEntityException({
        code: "validation_error",
        message: "Поле files обязательно",
        details: [{ field: "files", message: "required" }],
      });
    }

    if (body.files.length < MIN_FILES || body.files.length > MAX_FILES) {
      throw new UnprocessableEntityException({
        code: "validation_error",
        message: `Количество файлов должно быть от ${MIN_FILES} до ${MAX_FILES}`,
        details: [{ field: "files", message: "minItems/maxItems" }],
      });
    }

    for (const [index, file] of body.files.entries()) {
      if (!file.fileName?.trim()) {
        throw new UnprocessableEntityException({
          code: "validation_error",
          message: "Имя файла обязательно",
          details: [{ field: `files[${index}].fileName`, message: "required" }],
        });
      }
      if (!Number.isInteger(file.sizeBytes) || file.sizeBytes < 1) {
        throw new UnprocessableEntityException({
          code: "validation_error",
          message: "Размер файла должен быть целым числом ≥ 1",
          details: [{ field: `files[${index}].sizeBytes`, message: "invalid" }],
        });
      }
      if (file.sha256 !== undefined && !SHA256_PATTERN.test(file.sha256)) {
        throw new UnprocessableEntityException({
          code: "validation_error",
          message: "sha256 должен быть hex-строкой длины 64",
          details: [{ field: `files[${index}].sha256`, message: "pattern" }],
        });
      }
      if (!ALLOWED_MIME_TYPES.has(file.mimeType)) {
        throw new UnsupportedMediaTypeException({
          code: "unsupported_media_type",
          message: "Неподдерживаемый формат файла",
          details: [{ field: `files[${index}].mimeType`, message: "unsupported" }],
        });
      }
      if (file.sizeBytes > this.storage.maxFileBytes) {
        throw new PayloadTooLargeException({
          code: "payload_too_large",
          message: "Файл или пакет превышает допустимый размер",
          details: [{ field: `files[${index}].sizeBytes`, message: "too_large" }],
        });
      }
    }
  }

  private async loadObjectOrThrow(organizationId: string, objectId: string) {
    const row = await this.db.orm.public.ConstructionObject.where({
      id: objectId,
      organizationId,
    }).first();

    if (!row) {
      throw new NotFoundException({
        code: "not_found",
        message: "Объект не найден",
      });
    }
    return row;
  }

  private async loadPackageWithDocsOrThrow(organizationId: string, packageId: string) {
    const row = await this.db.orm.public.Package.where({ id: packageId })
      .include("object")
      .include("documents", (docs) => docs.include("fileAsset"))
      .first();

    if (!row || row.object.organizationId !== organizationId) {
      throw new NotFoundException({
        code: "not_found",
        message: "Пакет не найден",
      });
    }
    return row;
  }

  private async loadPackageDetailOrThrow(organizationId: string, packageId: string) {
    const row = await this.db.orm.public.Package.where({ id: packageId })
      .include("object")
      .include("documents", (docs) => docs.include("fileAsset").include("documentType").include("stageRuns"))
      .first();

    if (!row || row.object.organizationId !== organizationId) {
      throw new NotFoundException({
        code: "not_found",
        message: "Пакет не найден",
      });
    }
    return row;
  }
}

function provisionalSha256(documentId: string): string {
  return createHash("sha256").update(`pending:${documentId}`).digest("hex");
}
