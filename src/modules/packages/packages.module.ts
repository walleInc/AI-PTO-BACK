import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { StorageModule } from "../storage/storage.module.js";
import { PackagesController } from "./packages.controller.js";
import { PackagesService } from "./packages.service.js";

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [PackagesController],
  providers: [PackagesService],
  exports: [PackagesService],
})
export class PackagesModule {}
