import { Module } from "@nestjs/common";
import { ObjectsService } from "./objects.service";
import { ObjectsController, WorkTypesController } from "./objects.controller";

@Module({
  controllers: [ObjectsController, WorkTypesController],
  providers: [ObjectsService],
})
export class ObjectsModule {}
