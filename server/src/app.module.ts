import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { UserModule } from "./users/user.module";
import { VideoModule } from "./videos/video.module";
import { DatabaseModule } from "./database/database.module";
import { UserRepository } from "./users/user.repository";

@Module({
  imports: [DatabaseModule, UserModule, VideoModule],
  controllers: [AppController],
  providers: [UserRepository, AppService],
})
export class AppModule {}
