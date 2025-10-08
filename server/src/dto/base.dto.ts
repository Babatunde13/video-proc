import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsStrongPassword,
  Max,
  Min,
} from "class-validator";
import { UserClient } from "../users/user.entity";
import { VideoClient } from "../videos/video.entity";

export const FIVE_GB = 5 * 1024 ** 3;

export class BaseResponseDto<T = object> {
  @ApiProperty({
    example: "success",
    type: "string",
    readOnly: true,
    required: true,
  })
  message: string;

  @ApiProperty({
    example: true,
    type: "boolean",
    readOnly: true,
    required: true,
  })
  success: boolean;

  @ApiProperty()
  data: T;
}

export class AuthResponse {
  @ApiProperty({ example: "date string", required: true })
  expiresIn: Date;

  @ApiProperty({ example: "token-===", required: true })
  token: string;
}

export class RegisterDto {
  @ApiProperty({
    type: "string",
    example: "new-password",
    minLength: 8,
    required: true,
  })
  @IsNotEmpty()
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        "Password must contain at least 8 characters, 1 lowercase, 1 uppercase, 1 number, and 1 symbol",
    },
  )
  password: string;

  @ApiProperty({
    type: "string",
    example: "Doe",
    required: true,
  })
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    type: "string",
    example: "customer@example.com",
    required: true,
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}

export class LoginDto {
  @ApiProperty({
    type: "string",
    example: "customer@example.com",
    required: true,
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    type: "string",
    example: "password",
    required: true,
    minLength: 8,
  })
  @IsNotEmpty()
  password: string;
}

export class PartDto {
  @ApiProperty({ example: 1, description: "Part number", required: true })
  @IsNotEmpty()
  @Min(1, { message: "cannot be lower than 1" })
  part_number: number;

  @ApiProperty({
    example: "etag-string",
    description: "ETag for the part",
    required: true,
  })
  @IsNotEmpty()
  etag: string;
}

export class InitiateLargeUploadDto {
  @ApiProperty({
    example: "video.mp4",
    description: "Filename to upload",
    required: true,
  })
  @IsNotEmpty()
  filename: string;

  @ApiProperty({
    example: "my cute video",
    description: "Description of the video",
    required: false,
  })
  description?: string;

  @ApiProperty({
    example: "video/mp4",
    description: "MIME type of the file",
    required: true,
    enum: ["video/mp4", "video/webm", "video/ogg"],
  })
  @IsNotEmpty()
  @IsIn(["video/mp4", "video/webm", "video/ogg"], {
    message: "contentType must be a valid video MIME type",
  })
  content_type: string;

  @ApiProperty({
    example: FIVE_GB,
    description: "File size in bytes",
    required: true,
    type: "number",
    minimum: 1,
    maximum: FIVE_GB,
  })
  @IsNotEmpty()
  @Min(1, { message: "File cannot be lower than 1 byte" })
  @Max(FIVE_GB, { message: "File cannot be bigger than 5GB" })
  size_bytes: number;
}

export class UploadPartDto {
  @ApiProperty({
    example: "upload-id-123",
    description: "Upload session ID",
    required: true,
  })
  @IsNotEmpty()
  upload_id: string;

  @ApiProperty({ example: 1, description: "Part number", required: true })
  @IsNotEmpty()
  @Min(1, { message: "cannot be lower than 1" })
  part_number: number;

  @ApiProperty({
    example: "checksum",
    description: "Check sum of the blob",
    required: true,
  })
  @IsNotEmpty()
  checksum: string;
}

export class CompleteLargeUploadDto {
  @ApiProperty({
    example: "upload-id-123",
    description: "Upload session ID",
    required: true,
  })
  @IsNotEmpty()
  upload_id: string;

  @ApiProperty({
    type: [PartDto],
    description: "Array of uploaded parts",
    required: true,
  })
  @IsNotEmpty()
  parts: PartDto[];

  @ApiProperty({
    example: "video.mp4",
    description: "Filename",
    required: true,
  })
  @IsNotEmpty()
  filename: string;

  @ApiProperty({
    example: "video/mp4",
    description: "MIME type of the file",
    required: true,
    enum: ["video/mp4", "video/webm", "video/ogg"],
  })
  @IsNotEmpty()
  @IsIn(["video/mp4", "video/webm", "video/ogg"], {
    message: "contentType must be a valid video MIME type",
  })
  content_type: string;

  @ApiProperty({
    example: FIVE_GB,
    description: "File size in bytes",
    required: true,
    type: "number",
    minimum: 1,
    maximum: FIVE_GB,
  })
  @IsNotEmpty()
  @Min(1, { message: "File cannot be lower than 1 byte" })
  @Max(FIVE_GB, { message: "File cannot be bigger than 5GB" })
  size_bytes: string;
}

export class CancelLargeUploadDto {
  @ApiProperty({
    example: "upload-id-123",
    description: "Upload session ID",
    required: true,
  })
  @IsNotEmpty()
  upload_id: string;
}

export class Login {
  @ApiProperty({ example: "token-===", required: true })
  auth: AuthResponse;

  @ApiProperty({ type: () => UserClient })
  user: UserClient;
}

export class LoginResponseDto extends BaseResponseDto<Login> {
  @ApiProperty({ example: "Login successfully" })
  message: string;

  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: Login })
  data: Login;
}

class InitiateLargeUploadResponse {
  @ApiProperty({ example: "upload session id" })
  upload_id: string;

  @ApiProperty({ example: "s3 key of the video" })
  s3_key: string;

  @ApiProperty({ example: "byte size of each chunk" })
  part_size_bytes: number;
}

class UploadPartResponse {
  @ApiProperty({ example: "presign url" })
  url: string;
}

export class InitiateLargeUploadResponseDto extends BaseResponseDto<InitiateLargeUploadResponse> {
  @ApiProperty({ example: "upload successfully" })
  message: string;

  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: InitiateLargeUploadResponse })
  data: InitiateLargeUploadResponse;
}

export class UploadPartResponseDto extends BaseResponseDto<UploadPartResponse> {
  @ApiProperty({ example: "presign url generated successfully" })
  message: string;

  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: UploadPartResponse })
  data: UploadPartResponse;
}

export class VideoResponseDto extends BaseResponseDto<VideoClient> {
  @ApiProperty({ example: "video fetched successfully" })
  message: string;

  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: VideoClient })
  data: VideoClient;
}

export class VideosResponseDto extends BaseResponseDto<VideoClient[]> {
  @ApiProperty({ example: "video fetched successfully" })
  message: string;

  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [VideoClient] })
  data: VideoClient[];
}
