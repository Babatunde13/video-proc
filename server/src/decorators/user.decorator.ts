import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";
import { User } from "../users/user.entity";

export const AuthUser = createParamDecorator(
  (data: keyof User, ctx: ExecutionContext) => {
    const request: Request & { user: User } = ctx.switchToHttp().getRequest();
    return data ? request.user?.[data] : request.user;
  },
);
