import { Global, Module } from "@nestjs/common";
import { db } from "./db.js";
import { DB } from "./db.token.js";

@Global()
@Module({
  providers: [{ provide: DB, useValue: db }],
  exports: [DB],
})
export class PrismaModule {}
