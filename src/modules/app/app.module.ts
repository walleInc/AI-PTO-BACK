import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ObjectsModule } from "../objects/objects.module";
import { PackagesModule } from "../packages/packages.module";
import { DocumentsModule } from "../documents/documents.module";
import { FindingsModule } from "../findings/findings.module";
import { ChecklistModule } from "../checklist/checklist.module";
import { ReportsModule } from "../reports/reports.module";

@Module({
  imports: [AuthModule, ObjectsModule, PackagesModule, DocumentsModule, FindingsModule, ChecklistModule, ReportsModule],
})
export class AppModule {}
