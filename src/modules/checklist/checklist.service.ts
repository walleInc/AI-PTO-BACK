import { Injectable, NotImplementedException } from "@nestjs/common";
import type { Checklist, ObjectSummary } from "../../common/dto/openapi.types.js";

@Injectable()
export class ChecklistService {
  getObjectSummary(_objectId: string): Promise<ObjectSummary> {
    throw new NotImplementedException("getObjectSummary is not implemented");
  }

  getChecklist(_objectId: string): Promise<Checklist> {
    throw new NotImplementedException("getChecklist is not implemented");
  }
}
