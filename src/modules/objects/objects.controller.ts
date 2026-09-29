import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import type {
  ConstructionObject,
  ListObjectsQuery,
  ObjectInput,
  ObjectUpdate,
  PageMeta,
  WorkType,
} from "../../common/dto/openapi.types";
import { ObjectsService } from "./objects.service";

@Controller("work-types")
export class WorkTypesController {
  constructor(private readonly objectsService: ObjectsService) {}

  @Get()
  listWorkTypes(): Promise<WorkType[]> {
    return this.objectsService.listWorkTypes();
  }
}

@Controller("objects")
export class ObjectsController {
  constructor(private readonly objectsService: ObjectsService) {}

  @Get()
  listObjects(@Query() query: ListObjectsQuery): Promise<{ items: ConstructionObject[]; meta: PageMeta }> {
    return this.objectsService.listObjects(query);
  }

  @Post()
  @HttpCode(201)
  createObject(@Body() body: ObjectInput): Promise<ConstructionObject> {
    return this.objectsService.createObject(body);
  }

  @Get(":objectId")
  getObject(@Param("objectId", ParseUUIDPipe) objectId: string): Promise<ConstructionObject> {
    return this.objectsService.getObject(objectId);
  }

  @Patch(":objectId")
  updateObject(
    @Param("objectId", ParseUUIDPipe) objectId: string,
    @Body() body: ObjectUpdate,
  ): Promise<ConstructionObject> {
    return this.objectsService.updateObject(objectId, body);
  }

  @Delete(":objectId")
  @HttpCode(204)
  deleteObject(@Param("objectId", ParseUUIDPipe) objectId: string): Promise<void> {
    return this.objectsService.deleteObject(objectId);
  }
}
