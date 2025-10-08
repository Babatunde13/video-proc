import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
import { errorResponse } from "../utils/response";
import envs from "../config/envs";

@Catch()
export class HttpExceptionFilter<T extends { is_critical_error: boolean }>
  implements ExceptionFilter
{
  private readonly logger = new Logger(HttpException.name);

  catch(exception: T, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    if (exception instanceof HttpException) {
      const httpStatus = exception.getStatus();
      const message = this.transformMessage(
        exception.getResponse() as { message: string[] },
      );
      response.status(httpStatus).json({
        status: "error",
        success: false,
        message,
        error: envs.IsProd ? {} : exception,
      });
    } else {
      const { message, status } = this.parseUnhandleException();
      exception.is_critical_error = true;
      this.logger.error("unhandled exception", exception);
      response.status(status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: "error",
        success: false,
        message,
        error: envs.IsProd ? {} : exception,
      });
    }
  }

  private transformMessage(
    message: string | { message: string[] } | { message: string },
  ): string {
    if (typeof message === "string") {
      return message;
    }

    //validation pipe error
    if (Array.isArray(message["message"])) {
      return message["message"][0];
    }
    return message["message"] || "An unknown error occured";
  }

  private parseUnhandleException(): {
    message: string;
    status: number;
  } {
    const response = errorResponse("An unknown error occured");
    return {
      ...response,
      status: HttpStatus.BAD_REQUEST,
    };
  }
}
