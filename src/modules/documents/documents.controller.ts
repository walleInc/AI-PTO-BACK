import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
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
import { SessionGuard } from "../auth/session.guard.js";
import { DocumentsService } from "./documents.service.js";

@Controller()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get("objects/:objectId/documents")
  @UseGuards(SessionGuard)
  listDocuments(
    @Param("objectId", ParseUUIDPipe) objectId: string,
    @Query() query: ListDocumentsQuery,
  ): Promise<{ items: Document[]; meta: PageMeta }> {
    return this.documentsService.listDocuments(objectId, query);
  }

  @Get("documents/:documentId")
  @UseGuards(SessionGuard)
  getDocument(@Param("documentId", ParseUUIDPipe) documentId: string): Promise<DocumentDetail> {
    return this.documentsService.getDocument(documentId);
  }

  @Patch("documents/:documentId")
  @UseGuards(SessionGuard)
  updateDocument(
    @Param("documentId", ParseUUIDPipe) documentId: string,
    @Body() body: DocumentUpdate,
  ): Promise<Document> {
    return this.documentsService.updateDocument(documentId, body);
  }

  @Delete("documents/:documentId")
  @HttpCode(204)
  @UseGuards(SessionGuard)
  deleteDocument(@CurrentUser() user: User, @Param("documentId", ParseUUIDPipe) documentId: string): Promise<void> {
    return this.documentsService.deleteDocument(user, documentId);
  }

  @Get("documents/:documentId/file")
  @UseGuards(SessionGuard)
  getDocumentFile(
    @CurrentUser() user: User,
    @Param("documentId", ParseUUIDPipe) documentId: string,
  ): Promise<{ url: string; expiresAt: string }> {
    return this.documentsService.getDocumentFile(user, documentId);
  }

  @Patch("documents/:documentId/fields")
  @UseGuards(SessionGuard)
  updateDocumentFields(
    @Param("documentId", ParseUUIDPipe) documentId: string,
    @Body() body: DocumentFieldsUpdate,
  ): Promise<DocumentDetail> {
    return this.documentsService.updateDocumentFields(documentId, body);
  }

  @Post("documents/:documentId/recheck")
  @HttpCode(202)
  @UseGuards(SessionGuard)
  recheckDocument(
    @Param("documentId", ParseUUIDPipe) documentId: string,
    @Body() body: DocumentRecheckRequest = {},
  ): Promise<Document> {
    return this.documentsService.recheckDocument(documentId, body);
  }
}
