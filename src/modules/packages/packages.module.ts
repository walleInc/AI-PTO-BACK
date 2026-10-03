import { Module } from "@nestjs/common";
import { PackagesService } from "./packages.service.js";
import { PackagesController } from "./packages.controller.js";

@Module({
  controllers: [PackagesController],
  providers: [PackagesService],
})
export class PackagesModule {}
