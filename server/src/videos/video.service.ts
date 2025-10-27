import fs from "fs-extra";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  GetObjectCommand,
  ListPartsCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import envs from "../config/envs";
import { VideoRepository } from "./video.repository";
import {
  CompleteLargeUploadDto,
  InitiateLargeUploadDto,
  PartDto,
  UploadPartDto,
} from "../dto/base.dto";
import { Video, VideoStatus } from "./video.entity";
import { Queue } from "bullmq";
import { isUniqueConstraintError } from "../database/database.service";
import { LogAction } from "../logger/app.logger";

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);
  private readonly s3Client: S3Client;
  private readonly partSizeBytes = 8 * 1024 ** 2; // 8MB

  constructor(
    private readonly repo: VideoRepository,
    @Inject("TRANSCODE_QUEUE") private readonly transcodeQueue: Queue,
  ) {
    this.s3Client = new S3Client({
      region: envs.Aws.region,
      endpoint: envs.Aws.endpoint,
      credentials: {
        accessKeyId: envs.Aws.accessKey,
        secretAccessKey: envs.Aws.secretAccessKey,
      },
      forcePathStyle: !!envs.Aws.endpoint,
    });
  }

  private createMultipart(bucket: string, key: string, contentType: string) {
    const command = new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });
    return this.s3Client.send(command);
  }

  private async uploadPart(
    bucket: string,
    key: string,
    uploadId: string,
    partNumber: number,
    checksum: string,
    expiresInSec = 3600,
  ) {
    const command = new UploadPartCommand({
      Bucket: bucket,
      Key: key,
      PartNumber: partNumber,
      UploadId: uploadId,
      ChecksumCRC32: checksum,
    });
    const url = await getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSec,
    });
    return url;
  }

  listParts(bucket: string, key: string, uploadId: string) {
    const command = new ListPartsCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
    });
    return this.s3Client.send(command);
  }

  private completeMultipartUpload(
    bucket: string,
    key: string,
    uploadId: string,
    parts: PartDto[],
  ) {
    const command = new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.map((p) => ({ ETag: p.etag, PartNumber: p.part_number })),
      },
    });
    return this.s3Client.send(command);
  }

  private async abortMultipartUpload(key: string, uploadId: string) {
    await this.s3Client.send(
      new AbortMultipartUploadCommand({
        Bucket: envs.Aws.bucket,
        Key: key,
        UploadId: uploadId,
      }),
    );
  }

  async initiateLargeUpload(userId: string, body: InitiateLargeUploadDto) {
    const key = `uploads/${userId}/${Date.now()}_${body.filename}`;
    try {
      const resp = await this.createMultipart(
        envs.Aws.bucket,
        key,
        body.content_type,
      );

      // insert resp to db
      await this.repo.create(
        new Video({
          content_type: body.content_type,
          filename: body.filename,
          s3_key: key,
          size_bytes: body.size_bytes,
          upload_id: resp.UploadId!,
          user_id: userId,
          status: VideoStatus.PENDING,
          description: body.description,
        }),
      );

      return {
        upload_id: resp.UploadId!,
        s3_key: key,
        part_size_bytes: this.partSizeBytes,
      };
    } catch (error) {
      // with the date.now() addition this should be almost impossible!!!
      if (isUniqueConstraintError(error)) {
        this.logger.error("bucket key already exist", {
          user_id: userId,
          error: error.detail,
          action: LogAction.INITIATE_UPLOAD,
          key,
        });

        throw new ConflictException("file already exist");
      } else {
        this.logger.error("error initiating upload", {
          user_id: userId,
          error: error,
          action: LogAction.INITIATE_UPLOAD,
          key,
          is_critical_error: true,
        });

        throw new BadRequestException(
          "something went wrong while initiating upload!",
        );
      }
    }
  }

  async generatePresignedUrlForPart(s3Key: string, body: UploadPartDto) {
    try {
      const url = await this.uploadPart(
        envs.Aws.bucket,
        s3Key,
        body.upload_id,
        body.part_number,
        body.checksum,
      );
      return { url };
    } catch (error) {
      this.logger.error("error generating presigned url for upload part", {
        error: error,
        action: LogAction.UPLOAD_PART,
        key: s3Key,
        upload_id: body.upload_id,
        part_number: body.part_number,
        is_critical_error: true,
      });

      throw new BadRequestException(
        "something went wrong while generating presigned url for part!",
      );
    }
  }

  async getUploadParts(s3Key: string, uploadId: string) {
    try {
      const parts = await this.listParts(envs.Aws.bucket, s3Key, uploadId);
      return { parts: parts.Parts || [] };
    } catch (error) {
      this.logger.error("error getting upload parts", {
        error: error,
        action: LogAction.GET_UPLOAD_PARTS,
        key: s3Key,
        upload_id: uploadId,
        is_critical_error: true,
      });

      throw new BadRequestException(
        "something went wrong while getting upload parts!",
      );
    }
  }

  async completeLargeUpload(s3Key: string, body: CompleteLargeUploadDto) {
    let hasCompleted = false;
    const video = await this.repo.findByS3Key(s3Key);
    if (!video) {
      throw new NotFoundException("No video with S3 found in our system.");
    }

    try {
      await this.completeMultipartUpload(
        envs.Aws.bucket,
        s3Key,
        body.upload_id,
        body.parts,
      );
      hasCompleted = true;

      await this.repo.updateVideo(
        new Video({ s3_key: s3Key }),
        new Video({ status: VideoStatus.UPLOADED }),
      );
      await this.transcodeQueue.add(
        "transcode-video",
        { videoId: video.id, s3Key },
        { attempts: 3, backoff: { type: "exponential", delay: 10000 } },
      );

      video.status = VideoStatus.UPLOADED;
      return video;
    } catch (error) {
      this.logger.error("error completing upload", {
        error: error,
        action: LogAction.COMPLETE_UPLOAD,
        key: s3Key,
        is_critical_error: true,
      });

      if (!hasCompleted) {
        await this.abortMultipartUpload(s3Key, body.upload_id);
        await this.repo.deleteOne({ s3_key: s3Key });
      }

      throw new BadRequestException(
        "something went wrong while completing upload!",
      );
    }
  }

  async cancelMultiPartUpload(key: string, uploadId: string) {
    try {
      await this.abortMultipartUpload(key, uploadId);
      this.logger.log(`Aborted multipart upload`, {
        s3_key: key,
        upload_id: uploadId,
        action: LogAction.CANCEL_UPLOAD,
      });
      await this.repo.deleteOne({ s3_key: key });
    } catch (err) {
      this.logger.error("Failed to abort multipart upload", {
        s3_key: key,
        upload_id: uploadId,
        action: LogAction.CANCEL_UPLOAD,
        error: err,
      });
    }
  }

  async findAllForUser(userId: string, status?: VideoStatus) {
    const videos = await this.repo.findAll(userId, status);
    return videos.map((video) => video.toJSON());
  }

  async findOneForUser(id: string, userId: string): Promise<Video | null> {
    const video = await this.repo.findOne({ id, user_id: userId });
    return video;
  }

  async findByID(id: string): Promise<Video | null> {
    const video = await this.repo.findOne({ id });
    return video;
  }

  async getVideoManifest(videoId: string) {
    const key = `processed/${videoId}/master.m3u8`;
    const data = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: envs.Aws.bucket,
        Key: key,
      }),
    );
    return data.Body;
  }

  async getVideoSegment(videoId: string, file: string) {
    const key = `processed/${videoId}/${file}`;
    const data = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: envs.Aws.bucket,
        Key: key,
      }),
    );
    return { data: data.Body, key };
  }

  async getVideo(key: string) {
    const data = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: envs.Aws.bucket,
        Key: key,
      }),
    );
    return data;
  }

  async uploadToS3(
    key: string,
    fileStream: fs.ReadStream,
    contentType: string,
  ) {
    const data = await this.s3Client.send(
      new PutObjectCommand({
        Bucket: envs.Aws.bucket,
        Key: key,
        Body: fileStream,
        ContentType: contentType,
      }),
    );
    return data;
  }

  updateVideo(filter: Partial<Video>, update: Partial<Video>) {
    return this.repo.updateVideo(filter, update);
  }
}
