import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { Video, VideoStatus } from "./video.entity";

@Injectable()
export class VideoRepository {
  private readonly table = "videos";

  constructor(private readonly db: DatabaseService) {}

  async create(data: Partial<Video>): Promise<Video> {
    const video = await this.db.insert<Video>(this.table, data);
    return new Video(video);
  }

  async findById(id: string): Promise<Video | null> {
    const video = await this.db.findOne<Video>(this.table, { id });
    return video ? new Video(video) : null;
  }

  async findOne(condition: Partial<Video>): Promise<Video | null> {
    const video = await this.db.findOne<Video>(this.table, condition);
    return video ? new Video(video) : null;
  }

  async findByS3Key(s3Key: string): Promise<Video | null> {
    const video = await this.db.findOne<Video>(this.table, { s3_key: s3Key });
    return video ? new Video(video) : null;
  }

  async findAllForUser(userId: string): Promise<Video[]> {
    const videos = await this.db.findAll<Video>(this.table, {
      user_id: userId,
    });
    return videos.map((video) => new Video(video)); // no pagination for now!!!
  }

  async updateVideo(filter: Partial<Video>, update: Partial<Video>) {
    update.updated_at = new Date();
    const video = await this.db.update(this.table, filter, update, ["id"]);
    return video ? new Video(video) : null;
  }

  async findAll(userId: string, status?: VideoStatus) {
    let query = `
select
    id, user_id, s3_key, upload_id, filename, description, thumbnail_url, hls_manifest_url,
    content_type, status, size_bytes, created_at, updated_at
from ${this.table}
where user_id = ?
    `;
    const params = [userId];
    if (status) {
      query += " and status = ?";
      params.push(status);
    }

    const videos = await this.db.rawQuery<Video[]>(query, params);
    return videos.map((video) => new Video(video)); // no pagination for now!!!
  }

  async deleteOne(condition: Partial<Video>): Promise<number> {
    const deleteCount = await this.db.delete<Video>(this.table, condition);
    return deleteCount;
  }
}
