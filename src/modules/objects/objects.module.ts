import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import {
  CounterpartiesController,
  ObjectsController,
  ObjectTypesController,
  WorkTypesController,
} from "./objects.controller";
import { ObjectsService } from "./objects.service";
import { RolesGuard } from "../../common/guards/roles.guard";

@Module({
  imports: [AuthModule],
  controllers: [ObjectTypesController, WorkTypesController, CounterpartiesController, ObjectsController],
  providers: [ObjectsService, RolesGuard],
  exports: [ObjectsService],
})
export class ObjectsModule {}
