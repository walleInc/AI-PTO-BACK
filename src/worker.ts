import "dotenv/config";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "./worker.module.js";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ["log", "error", "warn"],
  });
  app.enableShutdownHooks();

  const logger = new Logger("Worker");
  logger.log("Document pipeline worker started");
}

await bootstrap();
