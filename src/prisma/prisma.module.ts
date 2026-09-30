import { Global, Module } from "@nestjs/common";
import { db } from "./db";
import { DB } from "./db.token";

@Global()
@Module({
  providers: [{ provide: DB, useValue: db }],
  exports: [DB],
})
export class PrismaModule {}
