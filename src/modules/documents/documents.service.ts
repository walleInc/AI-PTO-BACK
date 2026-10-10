import { Inject, Injectable, NotFoundException, NotImplementedException } from "@nestjs/common";
import type {
  Document,
  DocumentDetail,
  DocumentFieldsUpdate,
  DocumentRecheckRequest,
  DocumentUpdate,
  ListDocumentsQuery,
  PageMeta,
  User,
} from "../../common/dto/openapi.types.js";
import { DB, type AppDb } from "../../prisma/db.token.js";
import { StorageService } from "../storage/storage.service.js";

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(DB) private readonly db: AppDb,
    private readonly storage: StorageService,
  ) {}

  listDocuments(_objectId: string, _query: ListDocumentsQuery): Promise<{ items: Document[]; meta: PageMeta }> {
    throw new NotImplementedException("listDocuments is not implemented");
  }

  getDocument(_documentId: string): Promise<DocumentDetail> {
    throw new NotImplementedException("getDocument is not implemented");
  }

  updateDocument(_documentId: string, _body: DocumentUpdate): Promise<Document> {
    throw new NotImplementedException("updateDocument is not implemented");
  }

  async deleteDocument(user: User, documentId: string): Promise<void> {
    const row = await this.loadDocumentOrThrow(user.organizationId, documentId);
    const fileAssetId = row.fileAssetId;
    const packageId = row.packageId;
    const objectKey = row.fileAsset?.objectKey ?? null;
    let shouldDeleteObject = false;

    await this.db.transaction(async (tx) => {
      const findings = await tx.orm.public.Finding.where({ documentId }).all();
      for (const finding of findings) {
        await tx.orm.public.FindingSource.where({ findingId: finding.id }).delete();
        await tx.orm.public.FindingHistory.where({ findingId: finding.id }).delete();
      }
      await tx.orm.public.Finding.where({ documentId }).delete();

      const sourceRefs = await tx.orm.public.SourceRef.where({ documentId }).all();
      for (const ref of sourceRefs) {
        await tx.orm.public.FindingSource.where({ sourceRefId: ref.id }).delete();
      }

      await tx.orm.public.ExtractedField.where({ documentId }).delete();
      await tx.orm.public.SourceRef.where({ documentId }).delete();
      await tx.orm.public.DocumentStageRun.where({ documentId }).delete();
      await tx.orm.public.ChecklistItemDocument.where({ documentId }).delete();
      await tx.orm.public.Document.where({ id: documentId }).delete();

      const pkg = await tx.orm.public.Package.where({ id: packageId }).first();
      if (pkg) {
        await tx.orm.public.Package.where({ id: packageId }).update({
          documentsCount: Math.max(0, pkg.documentsCount - 1),
        });
      }

      if (fileAssetId) {
        const other = await tx.orm.public.Document.where({ fileAssetId }).first();
        if (!other) {
          await tx.orm.public.FileAsset.where({ duplicateOfId: fileAssetId }).update({
            duplicateOfId: null,
          });
          await tx.orm.public.FileAsset.where({ id: fileAssetId }).delete();
          shouldDeleteObject = Boolean(objectKey);
        }
      }
    });

    if (shouldDeleteObject && objectKey) {
      await this.storage.deleteObject(objectKey);
    }
  }

  async getDocumentFile(user: User, documentId: string): Promise<{ url: string; expiresAt: string }> {
    const row = await this.loadDocumentOrThrow(user.organizationId, documentId);
    if (!row.fileAsset) {
      throw new NotFoundException({
        code: "not_found",
        message: "Файл документа не найден",
      });
    }

    return this.storage.presignGet(row.fileAsset.objectKey);
  }

  updateDocumentFields(_documentId: string, _body: DocumentFieldsUpdate): Promise<DocumentDetail> {
    throw new NotImplementedException("updateDocumentFields is not implemented");
  }

  recheckDocument(_documentId: string, _body: DocumentRecheckRequest): Promise<Document> {
    throw new NotImplementedException("recheckDocument is not implemented");
  }

  private async loadDocumentOrThrow(organizationId: string, documentId: string) {
    const row = await this.db.orm.public.Document.where({ id: documentId })
      .include("object")
      .include("fileAsset")
      .first();

    if (!row || row.object.organizationId !== organizationId) {
      throw new NotFoundException({
        code: "not_found",
        message: "Документ не найден",
      });
    }
    return row;
  }
}
