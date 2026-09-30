import { Injectable, NotImplementedException } from "@nestjs/common";
import type { Report } from "../../common/dto/openapi.types";

@Injectable()
export class ReportsService {
  listReports(_objectId: string): Promise<Report[]> {
    throw new NotImplementedException("listReports is not implemented");
  }

  getReport(_reportId: string): Promise<Report> {
    throw new NotImplementedException("getReport is not implemented");
  }

  downloadReport(_reportId: string): Promise<Buffer> {
    throw new NotImplementedException("downloadReport is not implemented");
  }
}
