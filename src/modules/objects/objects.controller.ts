import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type {
  ConstructionObject,
  Counterparty,
  ListObjectsQuery,
  ObjectStatusChange,
  ObjectType,
  ObjectWrite,
  User,
  WorkType,
} from "../../common/dto/openapi.types";
import { Roles, RolesGuard } from "../../common/guards/roles.guard";
import { SessionGuard } from "../auth/session.guard";
import { ObjectsService } from "./objects.service";

@Controller("object-types")
@UseGuards(SessionGuard)
export class ObjectTypesController {
  constructor(private readonly objectsService: ObjectsService) {}

  @Get()
  listObjectTypes(): Promise<ObjectType[]> {
    return this.objectsService.listObjectTypes();
  }
}

@Controller("work-types")
@UseGuards(SessionGuard)
export class WorkTypesController {
  constructor(private readonly objectsService: ObjectsService) {}

  @Get()
  listWorkTypes(): Promise<WorkType[]> {
    return this.objectsService.listWorkTypes();
  }
}

@Controller("counterparties")
@UseGuards(SessionGuard)
export class CounterpartiesController {
  constructor(private readonly objectsService: ObjectsService) {}

  @Get()
  listCounterparties(): Promise<Counterparty[]> {
    return this.objectsService.listCounterparties();
  }
}

@Controller("objects")
@UseGuards(SessionGuard)
export class ObjectsController {
  constructor(private readonly objectsService: ObjectsService) {}

  @Get()
  listObjects(@CurrentUser() user: User, @Query() query: ListObjectsQuery): Promise<ConstructionObject[]> {
    return this.objectsService.listObjects(user, query);
  }

  @Post()
  @HttpCode(201)
  @UseGuards(RolesGuard)
  @Roles("owner")
  createObject(@CurrentUser() user: User, @Body() body: ObjectWrite): Promise<ConstructionObject> {
    return this.objectsService.createObject(user, body);
  }

  @Get(":objectId")
  getObject(
    @CurrentUser() user: User,
    @Param("objectId", ParseUUIDPipe) objectId: string,
  ): Promise<ConstructionObject> {
    return this.objectsService.getObject(user, objectId);
  }

  @Patch(":objectId")
  @UseGuards(RolesGuard)
  @Roles("owner")
  updateObject(
    @CurrentUser() user: User,
    @Param("objectId", ParseUUIDPipe) objectId: string,
    @Body() body: ObjectWrite,
  ): Promise<ConstructionObject> {
    return this.objectsService.updateObject(user, objectId, body);
  }

  @Post(":objectId/status")
  @UseGuards(RolesGuard)
  @Roles("owner")
  changeStatus(
    @CurrentUser() user: User,
    @Param("objectId", ParseUUIDPipe) objectId: string,
    @Body() body: ObjectStatusChange,
  ): Promise<ConstructionObject> {
    return this.objectsService.changeStatus(user, objectId, body);
  }

  @Post(":objectId/archive")
  @UseGuards(RolesGuard)
  @Roles("owner")
  archiveObject(
    @CurrentUser() user: User,
    @Param("objectId", ParseUUIDPipe) objectId: string,
  ): Promise<ConstructionObject> {
    return this.objectsService.archiveObject(user, objectId);
  }
}
