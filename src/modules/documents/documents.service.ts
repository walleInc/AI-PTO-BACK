import { Injectable, NotImplementedException } from "@nestjs/common";
import type {
  Document,
  DocumentDetail,
  DocumentFieldsUpdate,
  DocumentRecheckRequest,
  DocumentUpdate,
  ListDocumentsQuery,
  PageMeta,
} from "../../common/dto/openapi.types";

@Injectable()
export class DocumentsService {
  listDocuments(_objectId: string, _query: ListDocumentsQuery): Promise<{ items: Document[]; meta: PageMeta }> {
    throw new NotImplementedException("listDocuments is not implemented");
  }

  getDocument(_documentId: string): Promise<DocumentDetail> {
    throw new NotImplementedException("getDocument is not implemented");
  }

  updateDocument(_documentId: string, _body: DocumentUpdate): Promise<Document> {
    throw new NotImplementedException("updateDocument is not implemented");
  }

  deleteDocument(_documentId: string): Promise<void> {
    throw new NotImplementedException("deleteDocument is not implemented");
  }

  getDocumentFile(_documentId: string): Promise<{ url: string; expiresAt: string }> {
    throw new NotImplementedException("getDocumentFile is not implemented");
  }

  updateDocumentFields(_documentId: string, _body: DocumentFieldsUpdate): Promise<DocumentDetail> {
    throw new NotImplementedException("updateDocumentFields is not implemented");
  }

  recheckDocument(_documentId: string, _body: DocumentRecheckRequest): Promise<Document> {
    throw new NotImplementedException("recheckDocument is not implemented");
  }
}
