import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { UserRepository } from "./user.repository";
import { User } from "./user.entity";
import { isUniqueConstraintError } from "../database/database.service";
import { LogAction } from "../logger/app.logger";
import { compareHash, hashString } from "../utils/hashing";

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(private readonly repo: UserRepository) {}

  async register(name: string, email: string, password: string): Promise<User> {
    try {
      const newUser = await this.repo.create(
        new User({ name, email, password: hashString(password) }),
      );
      return newUser;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        this.logger.error("Email already exists", {
          email,
          action: LogAction.REGISTER,
          error: error.detail,
          is_critical_error: true,
        });

        throw new ConflictException("Account already exists");
      } else {
        this.logger.error("Unable to create account", {
          email,
          action: LogAction.REGISTER,
          error: error,
          is_critical_error: true,
        });

        throw new BadRequestException(
          "Something went wrong while creating account",
        );
      }
    }
  }

  async authenticateUser(email: string, password: string): Promise<User> {
    email = email.toLowerCase();
    const user = await this.repo.findByEmail(email);
    if (!user) {
      this.logger.error("User not found", {
        email,
        action: LogAction.LOGIN,
      });
      throw new UnauthorizedException("Invalid email or password");
    }

    if (!compareHash(password, user.password)) {
      this.logger.error("Invalid password", {
        email,
        id: user.id,
        action: LogAction.LOGIN,
      });
      throw new UnauthorizedException("Invalid email or password");
    }

    return user;
  }
}
