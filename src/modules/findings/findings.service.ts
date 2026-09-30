import { Injectable, NotImplementedException } from "@nestjs/common";
import type {
  Finding,
  FindingBulkUpdate,
  FindingHistoryEntry,
  FindingUpdate,
  ListFindingsQuery,
  PageMeta,
  SeverityCounts,
} from "../../common/dto/openapi.types";

@Injectable()
export class FindingsService {
  listFindings(
    _objectId: string,
    _query: ListFindingsQuery,
  ): Promise<{
    items: Finding[];
    meta: PageMeta;
    aggregates?: {
      bySeverity: SeverityCounts;
      byStatus: Record<string, number>;
    };
  }> {
    throw new NotImplementedException("listFindings is not implemented");
  }

  bulkUpdateFindings(_body: FindingBulkUpdate): Promise<{ updated: number }> {
    throw new NotImplementedException("bulkUpdateFindings is not implemented");
  }

  getFinding(_findingId: string): Promise<Finding> {
    throw new NotImplementedException("getFinding is not implemented");
  }

  updateFinding(_findingId: string, _body: FindingUpdate): Promise<Finding> {
    throw new NotImplementedException("updateFinding is not implemented");
  }

  getFindingHistory(_findingId: string): Promise<FindingHistoryEntry[]> {
    throw new NotImplementedException("getFindingHistory is not implemented");
  }
}
