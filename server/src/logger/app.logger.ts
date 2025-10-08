import {
  LoggerService,
  Injectable,
  Scope,
  ConsoleLogger,
} from "@nestjs/common";

export enum LogAction {
  COMPLETE_UPLOAD = "COMPLETE_UPLOAD",
  REGISTER = "REGISTER",
  LOGIN = "LOGIN",
  INITIATE_UPLOAD = "INITIATE_UPLOAD",
  UPLOAD_PART = "UPLOAD_PART",
  GET_UPLOAD_PARTS = "GET_UPLOAD_PARTS",
  CANCEL_UPLOAD = "CANCEL_UPLOAD",
}

@Injectable({ scope: Scope.DEFAULT })
export class VeoProcLogger extends ConsoleLogger implements LoggerService {
  constructor() {
    super({ prefix: "veoproc" });
  }

  log(message: any, trace?: string) {
    if (typeof trace === "object") (trace as any).process_id = process.pid;
    super.log(message, trace);
  }

  error(message: any, trace?: string, context?: string) {
    if (typeof trace === "object") (trace as any).process_id = process.pid;
    super.error(message, trace, context);
  }

  warn(message: any, trace?: string) {
    if (typeof trace === "object") (trace as any).process_id = process.pid;
    super.warn(message, trace);
  }

  debug(message: any, trace?: string) {
    if (typeof trace === "object") (trace as any).process_id = process.pid;
    super.debug(message, trace);
  }

  verbose(message: any, trace?: string) {
    if (typeof trace === "object") (trace as any).process_id = process.pid;
    super.verbose(message, trace);
  }
}
