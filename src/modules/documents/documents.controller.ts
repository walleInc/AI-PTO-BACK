import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import type {
  Document,
  DocumentDetail,
  DocumentFieldsUpdate,
  DocumentRecheckRequest,
  DocumentUpdate,
  ListDocumentsQuery,
  PageMeta,
} from "../../common/dto/openapi.types.js";
import { DocumentsService } from "./documents.service.js";

@Controller()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get("objects/:objectId/documents")
  listDocuments(
    @Param("objectId", ParseUUIDPipe) objectId: string,
    @Query() query: ListDocumentsQuery,
  ): Promise<{ items: Document[]; meta: PageMeta }> {
    return this.documentsService.listDocuments(objectId, query);
  }

  @Get("documents/:documentId")
  getDocument(@Param("documentId", ParseUUIDPipe) documentId: string): Promise<DocumentDetail> {
    return this.documentsService.getDocument(documentId);
  }

  @Patch("documents/:documentId")
  updateDocument(
    @Param("documentId", ParseUUIDPipe) documentId: string,
    @Body() body: DocumentUpdate,
  ): Promise<Document> {
    return this.documentsService.updateDocument(documentId, body);
  }

  @Delete("documents/:documentId")
  @HttpCode(204)
  deleteDocument(@Param("documentId", ParseUUIDPipe) documentId: string): Promise<void> {
    return this.documentsService.deleteDocument(documentId);
  }

  @Get("documents/:documentId/file")
  getDocumentFile(@Param("documentId", ParseUUIDPipe) documentId: string): Promise<{ url: string; expiresAt: string }> {
    return this.documentsService.getDocumentFile(documentId);
  }

  @Patch("documents/:documentId/fields")
  updateDocumentFields(
    @Param("documentId", ParseUUIDPipe) documentId: string,
    @Body() body: DocumentFieldsUpdate,
  ): Promise<DocumentDetail> {
    return this.documentsService.updateDocumentFields(documentId, body);
  }

  @Post("documents/:documentId/recheck")
  @HttpCode(202)
  recheckDocument(
    @Param("documentId", ParseUUIDPipe) documentId: string,
    @Body() body: DocumentRecheckRequest = {},
  ): Promise<Document> {
    return this.documentsService.recheckDocument(documentId, body);
  }
}
