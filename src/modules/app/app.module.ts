import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module.js";
import { QueueModule } from "../../queue/queue.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { EmployeesModule } from "../employees/employees.module.js";
import { ObjectsModule } from "../objects/objects.module.js";
import { PackagesModule } from "../packages/packages.module.js";
import { DocumentsModule } from "../documents/documents.module.js";
import { FindingsModule } from "../findings/findings.module.js";
import { ChecklistModule } from "../checklist/checklist.module.js";
import { ReportsModule } from "../reports/reports.module.js";

@Module({
  imports: [
    PrismaModule,
    QueueModule,
    AuthModule,
    EmployeesModule,
    ObjectsModule,
    PackagesModule,
    DocumentsModule,
    FindingsModule,
    ChecklistModule,
    ReportsModule,
  ],
})
export class AppModule {}
