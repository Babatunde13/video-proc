import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { UserRepository } from "../users/user.repository";
import { TokenType, verifyToken } from "../utils/jwt";
import { User } from "../users/user.entity";
import { Request } from "express";

@Injectable()
export class UserGuard implements CanActivate {
  private readonly logger = new Logger(UserGuard.name);
  constructor(private readonly userRepository: UserRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request & { user: User } = context
      .switchToHttp()
      .getRequest();
    if (!request.headers.authorization) {
      this.logger.error("No authorization header", {
        url: request.url,
        method: request.method,
        action: "UserGuard",
      });
      throw new UnauthorizedException("Unauthorized access");
    }

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      this.logger.error("Invalid authorization header", {
        url: request.url,
        method: request.method,
        action: "UserGuard",
      });
      throw new UnauthorizedException("Unauthorized access");
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
      this.logger.error("No token provided", {
        url: request.url,
        method: request.method,
        action: "UserGuard",
      });
      throw new UnauthorizedException("Unauthorized access");
    }
    const user = await this.validateToken(token, request);
    request.user = user;
    return true;
  }

  private async validateToken(token: string, request?: Request) {
    let decoded: { id: string; type: TokenType; client: string };
    try {
      decoded = verifyToken<{
        id: string;
        type: TokenType;
        client: string;
      }>(token);
      if (
        !decoded.id ||
        decoded.type !== TokenType.ACCESS_TOKEN ||
        decoded.client !== "app"
      ) {
        this.logger.error("Invalid or expired token payload", {
          id: decoded.id,
          method: request?.method,
          url: request?.url,
          type: decoded.type,
          action: "UserGuard",
          client: decoded.client,
        });
        throw new UnauthorizedException("Invalid or expired token");
      }
    } catch (e) {
      throw new UnauthorizedException((e as HttpException).message);
    }

    const user = await this.userRepository.findById(decoded.id);
    if (!user) {
      this.logger.error("User not found", {
        id: decoded.id,
        method: request?.method,
        url: request?.url,
        type: decoded.type,
        action: "UserGuard",
      });
      throw new UnauthorizedException("Invalid or expired token");
    }

    return user;
  }
}
