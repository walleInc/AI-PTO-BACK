import { Body, Controller, Get, HttpCode, MessageEvent, Param, ParseUUIDPipe, Post, Sse } from "@nestjs/common";
import type { Observable } from "rxjs";
import type {
  Package,
  PackageCreate,
  PackageCreated,
  PackageDetail,
  Report,
  ReportCreate,
} from "../../common/dto/openapi.types.js";
import { PackagesService } from "./packages.service.js";

@Controller()
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Get("objects/:objectId/packages")
  listPackages(@Param("objectId", ParseUUIDPipe) objectId: string): Promise<Package[]> {
    return this.packagesService.listPackages(objectId);
  }

  @Post("objects/:objectId/packages")
  @HttpCode(201)
  createPackage(
    @Param("objectId", ParseUUIDPipe) objectId: string,
    @Body() body: PackageCreate,
  ): Promise<PackageCreated> {
    return this.packagesService.createPackage(objectId, body);
  }

  @Get("packages/:packageId")
  getPackage(@Param("packageId", ParseUUIDPipe) packageId: string): Promise<PackageDetail> {
    return this.packagesService.getPackage(packageId);
  }

  @Post("packages/:packageId/start")
  @HttpCode(202)
  startPackage(@Param("packageId", ParseUUIDPipe) packageId: string): Promise<Package> {
    return this.packagesService.startPackage(packageId);
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
