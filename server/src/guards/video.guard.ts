import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { User } from "../users/user.entity";
import { Request } from "express";

@Injectable()
export class VideoPermissionGuard implements CanActivate {
  private readonly logger = new Logger(VideoPermissionGuard.name);
  constructor() {}

  canActivate(context: ExecutionContext): boolean {
    const request: Request & { user: User } = context
      .switchToHttp()
      .getRequest();

    const key = request.params["s3_key"];
    const userId = request.user.id;
    if (!key.includes(userId)) {
      this.logger.error("Unauthorized access", {
        id: request.user.id,
        key,
        url: request.url,
        method: request.method,
        action: "VideoPermissionGuard",
      });
      throw new ForbiddenException(
        `Unauthorized access, you did not create this file`,
      );
    }

    return true;
  }
}
