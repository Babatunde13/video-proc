import { Response } from "express";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOkResponse } from "@nestjs/swagger";
import { AppService } from "./app.service";
import { successResponse } from "./utils/response";
import {
  BaseResponseDto,
  CancelLargeUploadDto,
  CompleteLargeUploadDto,
  InitiateLargeUploadDto,
  InitiateLargeUploadResponseDto,
  LoginDto,
  LoginResponseDto,
  RegisterDto,
  UploadPartDto,
  VideoResponseDto,
  VideosResponseDto,
} from "./dto/base.dto";
import { UserGuard } from "./guards/user.guard";
import { AuthUser } from "./decorators/user.decorator";
import { User } from "./users/user.entity";
import { VideoStatus } from "./videos/video.entity";
import { VideoPermissionGuard } from "./guards/video.guard";

@Controller("")
@ApiBearerAuth()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post("auth/register")
  @ApiBody({
    description: "Register",
    type: RegisterDto,
  })
  @ApiOkResponse({
    description: "Register",
    type: BaseResponseDto,
  })
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: RegisterDto): Promise<BaseResponseDto> {
    await this.appService.register(body);
    return successResponse({}, "Signup successful!");
  }

  @Post("auth/login")
  @ApiBody({
    description: "Login",
    type: LoginDto,
  })
  @ApiOkResponse({
    description: "Login",
    type: LoginResponseDto,
  })
  @HttpCode(HttpStatus.CREATED)
  async login(@Body() body: LoginDto): Promise<LoginResponseDto> {
    const resp = await this.appService.login(body);
    return successResponse(resp, "login successful!");
  }

  @Post("/uploads/initiate")
  @UseGuards(UserGuard)
  @ApiBody({
    description: "Initiate a large upload",
    type: InitiateLargeUploadDto,
  })
  @ApiOkResponse({
    description: "Initiate a large upload",
    type: InitiateLargeUploadResponseDto,
  })
  @HttpCode(HttpStatus.CREATED)
  async initiateLargeUpload(
    @AuthUser() user: User,
    @Body() body: InitiateLargeUploadDto,
  ): Promise<InitiateLargeUploadResponseDto> {
    const resp = await this.appService.initiateLargeUpload(user.id, body);
    return successResponse(resp, "upload initiated successfully!");
  }

  @Post("/uploads/:s3_key/presign")
  @UseGuards(UserGuard, VideoPermissionGuard)
  @ApiBody({
    description:
      "Generate presign url to upload a chunk of the large file(video)",
    type: UploadPartDto,
  })
  @ApiOkResponse({
    description:
      "Generate presign url to upload a chunk of the large file(video)",
    type: BaseResponseDto<{ url: string }>,
  })
  @HttpCode(HttpStatus.OK)
  async uploadPart(
    @Param("s3_key") s3Key: string,
    @Body() body: UploadPartDto,
  ): Promise<BaseResponseDto<{ url: string }>> {
    const resp = await this.appService.uploadPart(s3Key, body);
    return successResponse(
      resp,
      "presign url generated for part successfully!",
    );
  }

  @Get("/uploads/:s3_key/parts")
  @UseGuards(UserGuard, VideoPermissionGuard)
  @ApiOkResponse({
    description: "Get all the parts of the large file upload",
    type: BaseResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async getParts(
    @Query("upload_id") uploadId: string,
    @Param("s3_key") s3Key: string,
  ): Promise<BaseResponseDto> {
    const resp = await this.appService.getParts(s3Key, uploadId);
    return successResponse(resp.parts, "parts fetched successdully!");
  }

  @Post("/uploads/:s3_key/complete")
  @UseGuards(UserGuard, VideoPermissionGuard)
  @ApiBody({
    description:
      "Complete(merge all files together) for the large upload chunks",
    type: CompleteLargeUploadDto,
  })
  @ApiOkResponse({
    description:
      "Complete(merge all files together) for the large upload chunks",
    type: VideoResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async completeLargeFileUpload(
    @Param("s3_key") s3Key: string,
    @Body() body: CompleteLargeUploadDto,
  ): Promise<VideoResponseDto> {
    const resp = await this.appService.completeLargeFileUpload(s3Key, body);
    return successResponse(resp, "upload completed sucessfully!");
  }

  @Post("uploads/:s3_key/abort")
  @UseGuards(UserGuard, VideoPermissionGuard)
  @ApiBody({
    description: "cancel upload",
    type: CancelLargeUploadDto,
  })
  @ApiOkResponse({
    description: "cancel upload",
    type: BaseResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async abortUpload(
    @AuthUser() user: User,
    @Param("s3_key") s3Key: string,
    @Body() body: CancelLargeUploadDto,
  ) {
    await this.appService.cancelLargeUpload(user.id, s3Key, body.upload_id);
    return { success: true };
  }

  @Get("/videos")
  @UseGuards(UserGuard)
  @ApiBody({
    description: "Fetch all uploaded video metadata",
  })
  @ApiOkResponse({
    description: "Fetch all uploaded video metadata",
    type: VideosResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async findAllVideos(
    @AuthUser() user: User,
    @Query("status") status?: VideoStatus,
  ): Promise<VideosResponseDto> {
    const resp = await this.appService.findAllVideosForUser(user.id, status);
    return successResponse(resp, "videos fetched sucessfully!");
  }

  @Get("/play/:id/manifest")
  @ApiBody({
    description: "Fetch video manifest",
    type: CompleteLargeUploadDto,
  })
  @ApiOkResponse({
    description: "Fetch video manifest",
    type: VideosResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async playManifest(@Param("id") id: string, @Res() res: Response) {
    const resp = await this.appService.playManifest(id);
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    return this.appService.pipeS3DataToRes(resp, res);
  }

  @Get("play/:id/*paths")
  async playVideoSegment(
    @Param("id") id: string,
    @Param("paths") paths: string[],
    @Res() res: Response,
  ) {
    const relativePath = paths.join("/");
    const { data, key } = await this.appService.playVideoSegment(
      id,
      relativePath,
    );

    if (key.endsWith(".ts")) {
      res.setHeader("Content-Type", "video/mp2t");
    }

    this.appService.pipeS3DataToRes(data, res);
  }
}
