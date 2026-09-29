import { Injectable, NotImplementedException } from "@nestjs/common";
import type {
  ConstructionObject,
  ListObjectsQuery,
  ObjectInput,
  ObjectUpdate,
  PageMeta,
  WorkType,
} from "../../common/dto/openapi.types";

@Injectable()
export class ObjectsService {
  listWorkTypes(): Promise<WorkType[]> {
    throw new NotImplementedException("listWorkTypes is not implemented");
  }

  listObjects(_query: ListObjectsQuery): Promise<{ items: ConstructionObject[]; meta: PageMeta }> {
    throw new NotImplementedException("listObjects is not implemented");
  }

  createObject(_body: ObjectInput): Promise<ConstructionObject> {
    throw new NotImplementedException("createObject is not implemented");
  }

  getObject(_objectId: string): Promise<ConstructionObject> {
    throw new NotImplementedException("getObject is not implemented");
  }

  updateObject(_objectId: string, _body: ObjectUpdate): Promise<ConstructionObject> {
    throw new NotImplementedException("updateObject is not implemented");
  }

  deleteObject(_objectId: string): Promise<void> {
    throw new NotImplementedException("deleteObject is not implemented");
  }
}
