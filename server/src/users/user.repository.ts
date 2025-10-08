import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { User } from "./user.entity";

@Injectable()
export class UserRepository {
  private readonly table = "users";

  constructor(private readonly db: DatabaseService) {}

  async create(data: Partial<User>): Promise<User> {
    const user = await this.db.insert<User>(this.table, data);
    return new User(user);
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.db.findOne<User>(this.table, { id });
    return user ? new User(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.db.findOne<User>(this.table, { email });
    return user ? new User(user) : null;
  }
}
