import { Module } from "@nestjs/common";
import { RolesGuard } from "../../common/guards/roles.guard.js";
import { AuthModule } from "../auth/auth.module.js";
import { EmployeesController } from "./employees.controller.js";
import { EmployeesService } from "./employees.service.js";

@Module({
  imports: [AuthModule],
  controllers: [EmployeesController],
  providers: [EmployeesService, RolesGuard],
  exports: [EmployeesService],
})
export class EmployeesModule {}
