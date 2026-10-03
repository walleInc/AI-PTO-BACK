import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import {
  CounterpartiesController,
  ObjectsController,
  ObjectTypesController,
  WorkTypesController,
} from "./objects.controller.js";
import { ObjectsService } from "./objects.service.js";
import { RolesGuard } from "../../common/guards/roles.guard.js";

@Module({
  imports: [AuthModule],
  controllers: [ObjectTypesController, WorkTypesController, CounterpartiesController, ObjectsController],
  providers: [ObjectsService, RolesGuard],
  exports: [ObjectsService],
})
export class ObjectsModule {}
