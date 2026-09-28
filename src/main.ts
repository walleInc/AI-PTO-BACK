import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app/app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, "0.0.0.0");
}
await bootstrap();
