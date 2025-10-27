import { Worker, Job } from "bullmq";
import * as path from "path";
import { pipeline } from "stream";
import { promisify } from "util";
import { spawn } from "child_process";
import * as fs from "fs-extra";
import envs from "./config/envs";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { VideoStatus } from "./videos/video.entity";
import { VideoService } from "./videos/video.service";

class VideoProcWorker {
  private readonly queueName = "transcode";
  private readonly bucket = envs.Aws.bucket;
  private readonly pump = promisify(pipeline);
  private worker: Worker;
  private videoService: VideoService;

  async onModuleInit() {
    const appContext = await NestFactory.createApplicationContext(AppModule);
    this.videoService = appContext.get(VideoService);
  }

  private runFFmPeg(args: string[], cwd: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", args, { cwd });
      ffmpeg.stdout.on("data", (d) => console.log(d.toString()));
      ffmpeg.stderr.on("data", (d) => console.log(d.toString())); // ffmpeg writes logs to stderr
      ffmpeg.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}`));
      });
    });
  }

  private async uploadToS3(key: string, filePath: string, contentType: string) {
    const fileStream = fs.createReadStream(filePath);
    await this.videoService.uploadToS3(key, fileStream, contentType);
  }

  private async downloadFromS3(key: string, destPath: string) {
    const obj = await this.videoService.getVideo(key);
    if (!obj.Body) throw new Error("Empty S3 object");
    await this.pump(
      obj.Body as NodeJS.ReadableStream,
      fs.createWriteStream(destPath),
    );
  }

  private async handler(job: Job<{ videoId: string; s3Key: string }>) {
    const { videoId, s3Key } = job.data;
    if (!videoId || !s3Key) {
      console.log(`[worker] missing required inputs for videoId and s3Key`);
      console.log({ videoId, s3Key });
      return;
    }
    console.log(`[worker] Received job for video ${videoId}`);

    const video = await this.videoService.findByID(videoId);
    if (!video) throw new Error("Video not found");
    if (video.status === VideoStatus.READY) {
      console.log(`[worker] Video ${videoId} already processed. Skipping`);
      return;
    }

    const workdir = path.join("/tmp", `video-${videoId}-${Date.now()}`);
    await fs.ensureDir(workdir);

    const srcPath = path.join(workdir, "source.mp4");
    const outputDir = path.join(workdir, "hls");
    await fs.ensureDir(outputDir);

    try {
      // Download original video from S3
      console.log(`[worker] Downloading ${s3Key} from S3`);
      await this.downloadFromS3(s3Key, srcPath);

      // Generate HLS (480p + 720p)
      // Master playlist will reference both variants
      console.log(`[worker] Running ffmpeg transcoding`);
      const hls480 = path.join(outputDir, "480p.m3u8");
      const hls720 = path.join(outputDir, "720p.m3u8");

      // Create two HLS variants
      await this.runFFmPeg(
        [
          "-i",
          srcPath,
          "-vf",
          "scale=-2:480",
          "-c:a",
          "aac",
          "-ar",
          "48000",
          "-c:v",
          "h264",
          "-profile:v",
          "main",
          "-crf",
          "20",
          "-sc_threshold",
          "0",
          "-g",
          "48",
          "-keyint_min",
          "48",
          "-hls_time",
          "4",
          "-hls_playlist_type",
          "vod",
          "-b:v",
          "800k",
          "-maxrate",
          "856k",
          "-bufsize",
          "1200k",
          "-hls_segment_filename",
          path.join(outputDir, "480p_%03d.ts"),
          hls480,
        ],
        workdir,
      );

      await this.runFFmPeg(
        [
          "-i",
          srcPath,
          "-vf",
          "scale=-2:720",
          "-c:a",
          "aac",
          "-ar",
          "48000",
          "-c:v",
          "h264",
          "-profile:v",
          "main",
          "-crf",
          "20",
          "-sc_threshold",
          "0",
          "-g",
          "48",
          "-keyint_min",
          "48",
          "-hls_time",
          "4",
          "-hls_playlist_type",
          "vod",
          "-b:v",
          "2800k",
          "-maxrate",
          "2996k",
          "-bufsize",
          "4200k",
          "-hls_segment_filename",
          path.join(outputDir, "720p_%03d.ts"),
          hls720,
        ],
        workdir,
      );

      // 3Generate master playlist
      const masterPlaylist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x480
480p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
720p.m3u8
`;
      const masterPath = path.join(outputDir, "master.m3u8");
      await fs.writeFile(masterPath, masterPlaylist);

      // Generate thumbnail
      const thumbPath = path.join(outputDir, "thumb.jpg");
      await this.runFFmPeg(
        ["-i", srcPath, "-ss", "00:00:02.000", "-vframes", "1", thumbPath],
        workdir,
      );

      // Upload all HLS files + thumbnail to S3
      console.log(`[worker] Uploading outputs to S3`);
      const uploadPromises: Promise<any>[] = [];
      for (const file of await fs.readdir(outputDir)) {
        const fpath = path.join(outputDir, file);
        const key = `processed/${videoId}/${file}`;
        const contentType = file.endsWith(".m3u8")
          ? "application/vnd.apple.mpegurl"
          : file.endsWith(".ts")
            ? "video/mp2t"
            : file.endsWith(".jpg")
              ? "image/jpeg"
              : "application/octet-stream";

        uploadPromises.push(this.uploadToS3(key, fpath, contentType));
      }
      await Promise.all(uploadPromises);

      // Update DB
      const baseUrl = `${envs.Aws.endpoint}/${this.bucket}`;
      const manifestUrl = `${baseUrl}/processed/${videoId}/master.m3u8`;
      const thumbUrl = `${baseUrl}/processed/${videoId}/thumb.jpg`;

      await this.videoService.updateVideo(
        { id: videoId },
        {
          status: VideoStatus.READY,
          hls_manifest_url: manifestUrl,
          thumbnail_url: thumbUrl,
        },
      );

      console.log(`[worker] Video ${videoId} processed successfully`);
    } catch (err) {
      console.error(`[worker] Error processing ${videoId}:`, err);
      await this.videoService.updateVideo(
        { id: videoId },
        {
          status: VideoStatus.FAILED,
        },
      );
      throw err;
    } finally {
      await fs.remove(workdir);
    }
  }

  setupWorker() {
    this.worker = new Worker(
      this.queueName,
      async (job: Job) => this.handler(job),
      {
        connection: { host: process.env.REDIS_HOST },
      },
    );

    this.worker.on("completed", (job) =>
      console.log(`[worker] Job ${job.id} completed`),
    );
    this.worker.on("failed", (job, err) =>
      console.error(`[worker] Job ${job?.id} failed`, err),
    );
  }
}

async function main() {
  const videoProcWorker = new VideoProcWorker();
  await videoProcWorker.onModuleInit();
  videoProcWorker.setupWorker();
}

main();
