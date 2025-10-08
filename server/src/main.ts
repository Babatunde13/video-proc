import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import * as morgan from "morgan";
import { AppModule } from "./app.module";
import { VeoProcLogger } from "./logger/app.logger";
import { HttpExceptionFilter } from "./exceptions/http-exception.filter";
import envs from "./config/envs";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(morgan("dev"));
  app.enableCors({
    preflightContinue: false,
    origin: envs.ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders:
      "Content-Type, Accept, Authorization, Cache-Control, Pragma",
  });
  app.use(helmet());
  app.setGlobalPrefix("/api/v1");
  app.enableShutdownHooks();
  app.useLogger(new VeoProcLogger());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({ stopAtFirstError: false, errorHttpStatusCode: 422 }),
  );
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Video Streaming API")
    .setDescription("API Docs for the Video Streaming API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("/api/v1/docs", app, document, {
    swaggerOptions: { tagsSorter: "alpha" },
  });
  await app.listen(envs.PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${envs.PORT}/api`);
    console.log(
      `📚 API Docs are available at http://localhost:${envs.PORT}/api/docs`,
    );
  });
}

bootstrap();
