import { Module } from "@nestjs/common";
import { VideoService } from "./video.service";
import { DatabaseModule } from "../database/database.module";
import { VideoRepository } from "./video.repository";
import { QueueModule } from "../queues/queue.module";

@Module({
  imports: [DatabaseModule, QueueModule],
  providers: [VideoRepository, VideoService],
  exports: [VideoService],
})
export class VideoModule {}
