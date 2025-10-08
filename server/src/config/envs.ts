import * as dotenv from "dotenv";

dotenv.config();

export default {
  ORIGIN: "*",
  DATABASE_URL:
    process.env.DATABASE_URL ||
    "postgresql://postgres:password@localhost:5432/nest",
  PORT: process.env.PORT || 3000,
  IsProd: process.env.NODE_ENV === "production",
  Aws: {
    region: process.env.AWS_REGION || "us-east-2",
    accessKey: process.env.AWS_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    bucket: process.env.AWS_S3_BUCKET || "video-store",
    endpoint: process.env.AWS_ENDPOINT, // used for localstack
  },
  Jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES,
  },
  Redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
};
