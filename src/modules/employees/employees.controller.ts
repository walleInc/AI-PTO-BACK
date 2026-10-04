import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import type { Employee, User } from "../../common/dto/openapi.types.js";
import { Roles, RolesGuard } from "../../common/guards/roles.guard.js";
import { SessionGuard } from "../auth/session.guard.js";
import { parseEmployeeCreate, parseEmployeeUpdate } from "./employee.dto.js";
import { EmployeesService } from "./employees.service.js";

@Controller("employees")
@UseGuards(SessionGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  listEmployees(@CurrentUser() user: User): Promise<Employee[]> {
    return this.employeesService.listEmployees(user);
  }

  @Get(":employeeId")
  @UseGuards(RolesGuard)
  @Roles("owner")
  getEmployee(@CurrentUser() user: User, @Param("employeeId", ParseUUIDPipe) employeeId: string): Promise<Employee> {
    return this.employeesService.getEmployee(user, employeeId);
  }

  @Post()
  @HttpCode(201)
  @UseGuards(RolesGuard)
  @Roles("owner")
  createEmployee(@CurrentUser() user: User, @Body() body: unknown): Promise<Employee> {
    return this.employeesService.createEmployee(user, parseEmployeeCreate(body));
  }

  @Patch(":employeeId")
  @UseGuards(RolesGuard)
  @Roles("owner")
  updateEmployee(
    @CurrentUser() user: User,
    @Param("employeeId", ParseUUIDPipe) employeeId: string,
    @Body() body: unknown,
  ): Promise<Employee> {
    return this.employeesService.updateEmployee(user, employeeId, parseEmployeeUpdate(body));
  }

  @Delete(":employeeId")
  @HttpCode(204)
  @UseGuards(RolesGuard)
  @Roles("owner")
  async deleteEmployee(
    @CurrentUser() user: User,
    @Param("employeeId", ParseUUIDPipe) employeeId: string,
  ): Promise<void> {
    await this.employeesService.deleteEmployee(user, employeeId);
  }
}
