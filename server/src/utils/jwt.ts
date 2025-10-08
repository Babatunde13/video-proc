import { sign, verify } from "jsonwebtoken";
import envs from "../config/envs";

export const generateToken = function (data: object, expiry?: string) {
  return sign({ ...data }, envs.Jwt.secret, {
    expiresIn: expiry || envs.Jwt.expiresIn,
  });
};

export const verifyToken = function <T>(token: string) {
  try {
    return verify(token, envs.Jwt.secret) as T & { iat: number };
  } catch {
    throw new Error("Invalid or expired token");
  }
};

export enum TokenType {
  ACCESS_TOKEN = "ACCESS_TOKEN",
}
