import { Global, Module } from "@nestjs/common";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import envs from "../config/envs";

@Global()
@Module({
  providers: [
    {
      provide: "BULLMQ_CONNECTION",
      useFactory: () => {
        return new IORedis({
          host: envs.Redis.host,
          port: parseInt(envs.Redis.port ?? "6379", 10),
        });
      },
    },
    {
      provide: "TRANSCODE_QUEUE",
      useFactory: (connection: IORedis) => {
        return new Queue("transcode", { connection });
      },
      inject: ["BULLMQ_CONNECTION"],
    },
  ],
  exports: ["TRANSCODE_QUEUE", "BULLMQ_CONNECTION"],
})
export class QueueModule {}
