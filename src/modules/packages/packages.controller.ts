import {
  Body,
  Controller,
  Get,
  HttpCode,
  MessageEvent,
  Param,
  ParseUUIDPipe,
  Post,
  Sse,
  UseGuards,
} from "@nestjs/common";
import type { Observable } from "rxjs";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import type {
  Package,
  PackageCreate,
  PackageCreated,
  PackageDetail,
  Report,
  ReportCreate,
  User,
} from "../../common/dto/openapi.types.js";
import { SessionGuard } from "../auth/session.guard.js";
import { PackagesService } from "./packages.service.js";

@Controller()
@UseGuards(SessionGuard)
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Get("objects/:objectId/packages")
  listPackages(@CurrentUser() user: User, @Param("objectId", ParseUUIDPipe) objectId: string): Promise<Package[]> {
    return this.packagesService.listPackages(user, objectId);
  }

  @Post("objects/:objectId/packages")
  @HttpCode(201)
  createPackage(
    @CurrentUser() user: User,
    @Param("objectId", ParseUUIDPipe) objectId: string,
    @Body() body: PackageCreate,
  ): Promise<PackageCreated> {
    return this.packagesService.createPackage(user, objectId, body);
  }

  @Get("packages/:packageId")
  getPackage(@CurrentUser() user: User, @Param("packageId", ParseUUIDPipe) packageId: string): Promise<PackageDetail> {
    return this.packagesService.getPackage(user, packageId);
  }

  @Post("packages/:packageId/start")
  @HttpCode(202)
  startPackage(@CurrentUser() user: User, @Param("packageId", ParseUUIDPipe) packageId: string): Promise<Package> {
    return this.packagesService.startPackage(user, packageId);
  }

  @Sse("packages/:packageId/events")
  streamPackageEvents(@Param("packageId", ParseUUIDPipe) packageId: string): Observable<MessageEvent> {
    return this.packagesService.streamPackageEvents(packageId);
  }

  @Post("packages/:packageId/reports")
  @HttpCode(202)
  createReport(@Param("packageId", ParseUUIDPipe) packageId: string, @Body() body: ReportCreate): Promise<Report> {
    return this.packagesService.createReport(packageId, body);
  }
}
