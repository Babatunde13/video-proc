import { ApiProperty } from "@nestjs/swagger";

export enum VideoStatus {
  PENDING = "PENDING",
  UPLOADED = "UPLOADED",
  PROCESSING = "PROCESSING",
  READY = "READY",
  FAILED = "FAILED",
}

export class Video {
  constructor(data: Partial<Video>) {
    for (const key in data) {
      this[key] = data[key];
    }
  }

  id: string;
  user_id: string;
  s3_key: string;
  upload_id: string;
  filename: string;
  description: string;
  thumbnail_url?: string;
  hls_manifest_url?: string;
  content_type: string;
  status: VideoStatus;
  size_bytes: number;
  created_at: Date;
  updated_at?: Date;

  toJSON(): VideoClient {
    return {
      id: this.id,
      user_id: this.user_id,
      description: this.description,
      thumbnail_url: this.thumbnail_url,
      filename: this.filename,
      status: this.status,
      content_type: this.content_type,
      size_bytes: this.size_bytes,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}

export class VideoClient {
  @ApiProperty({
    title: "id",
    description: "ID of the Video",
    required: true,
    readOnly: true,
  })
  id: string;

  @ApiProperty({
    title: "user_id",
    description: "user_id of the video",
    required: true,
    readOnly: true,
  })
  user_id: string;

  @ApiProperty({
    title: "filename",
    description: "filename of the video",
    required: true,
    readOnly: true,
  })
  filename: string;

  @ApiProperty({
    title: "status",
    description: "status of the video upload",
    required: true,
    readOnly: true,
  })
  status: VideoStatus;

  @ApiProperty({
    title: "content_type",
    description: "content type of the video",
    required: true,
    readOnly: true,
  })
  content_type: string;

  @ApiProperty({
    title: "thumbnail_url",
    description: "thumbnail url of the video",
    readOnly: true,
  })
  thumbnail_url?: string;

  @ApiProperty({
    title: "description",
    description: "description of the video",
    required: true,
    readOnly: true,
  })
  description: string;

  @ApiProperty({
    title: "size_bytes",
    description: "The size of the video in bytes",
    required: true,
    readOnly: true,
  })
  size_bytes: number;

  @ApiProperty({
    title: "created_at",
    description: "Creation date of the video",
    required: true,
    readOnly: true,
  })
  created_at: Date;

  @ApiProperty({
    title: "updated_at",
    description: "Last updated at date of the video",
    required: true,
    readOnly: true,
  })
  updated_at?: Date;
}
