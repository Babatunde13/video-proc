import { pipeline } from "stream";
import { promisify } from "util";
import { Response } from "express";
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { GetObjectCommandOutput } from "@aws-sdk/client-s3";
import {
  CompleteLargeUploadDto,
  InitiateLargeUploadDto,
  Login,
  LoginDto,
  RegisterDto,
  UploadPartDto,
} from "./dto/base.dto";
import { UserService } from "./users/user.service";
import { generateToken, TokenType } from "./utils/jwt";
import { addHoursToDate } from "./utils/date";
import { VideoService } from "./videos/video.service";
import { VideoStatus } from "./videos/video.entity";

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly userService: UserService,
    private readonly videoService: VideoService,
  ) {}

  async register(input: RegisterDto) {
    return this.userService.register(input.name, input.email, input.password);
  }

  async login(input: LoginDto): Promise<Login> {
    const user = await this.userService.authenticateUser(
      input.email,
      input.password,
    );
    const token = this.generateToken(user.id, TokenType.ACCESS_TOKEN, "1d");
    return {
      auth: {
        expiresIn: addHoursToDate(24),
        token,
      },
      user: user.toJSON(),
    };
  }

  async initiateLargeUpload(userId: string, body: InitiateLargeUploadDto) {
    const resp = await this.videoService.initiateLargeUpload(userId, body);
    return resp;
  }

  async uploadPart(s3Key: string, body: UploadPartDto) {
    const resp = await this.videoService.generatePresignedUrlForPart(
      s3Key,
      body,
    );
    return resp;
  }

  async getParts(s3Key: string, uploadId: string) {
    const resp = await this.videoService.getUploadParts(s3Key, uploadId);
    return resp;
  }

  async completeLargeFileUpload(s3Key: string, body: CompleteLargeUploadDto) {
    const resp = await this.videoService.completeLargeUpload(s3Key, body);
    return resp;
  }

  async findAllVideosForUser(userId: string, status?: VideoStatus) {
    return this.videoService.findAllForUser(userId, status);
  }

  async playManifest(id: string) {
    const video = await this.videoService.findByID(id);
    if (!video) {
      throw new NotFoundException("Video not found");
    }

    const manifestData = await this.videoService.getVideoManifest(video.id);
    return manifestData;
  }

  async playVideoSegment(id: string, path: string) {
    const video = await this.videoService.findByID(id);
    if (!video) {
      throw new NotFoundException("Video not found");
    }

    const manifestData = await this.videoService.getVideoSegment(
      video.id,
      path,
    );
    return manifestData;
  }

  async cancelLargeUpload(userId: string, key: string, uploadId: string) {
    if (!key.includes(userId)) {
      throw new ForbiddenException("File was not initiated by you!");
    }
    return this.videoService.cancelMultiPartUpload(key, uploadId);
  }

  async pipeS3DataToRes(file: GetObjectCommandOutput["Body"], res: Response) {
    if (file) {
      const nodeStream = file as NodeJS.ReadableStream;
      const pipe = promisify(pipeline);
      try {
        await pipe(nodeStream, res);
      } catch (error) {
        console.log(error);
        res.status(500).send("faile dto send stream");
      }
    } else {
      res.status(404).send("Not found");
    }
  }

  private generateToken(
    id: string,
    type = TokenType.ACCESS_TOKEN,
    expiresIn?: string,
  ) {
    return generateToken({ id, type, client: "app" }, expiresIn);
  }
}
