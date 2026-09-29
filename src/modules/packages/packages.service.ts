import { Injectable, MessageEvent, NotImplementedException } from "@nestjs/common";
import type { Observable } from "rxjs";
import type {
  Package,
  PackageCreate,
  PackageCreated,
  PackageDetail,
  Report,
  ReportCreate,
} from "../../common/dto/openapi.types";

@Injectable()
export class PackagesService {
  listPackages(_objectId: string): Promise<Package[]> {
    throw new NotImplementedException("listPackages is not implemented");
  }

  createPackage(_objectId: string, _body: PackageCreate): Promise<PackageCreated> {
    throw new NotImplementedException("createPackage is not implemented");
  }

  getPackage(_packageId: string): Promise<PackageDetail> {
    throw new NotImplementedException("getPackage is not implemented");
  }

  startPackage(_packageId: string): Promise<Package> {
    throw new NotImplementedException("startPackage is not implemented");
  }

  streamPackageEvents(_packageId: string): Observable<MessageEvent> {
    throw new NotImplementedException("streamPackageEvents is not implemented");
  }

  createReport(_packageId: string, _body: ReportCreate): Promise<Report> {
    throw new NotImplementedException("createReport is not implemented");
  }
}
