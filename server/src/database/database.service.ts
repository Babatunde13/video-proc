import { Injectable, Inject, OnModuleDestroy, Logger } from "@nestjs/common";
import { Knex } from "knex";
import { ulid } from "ulid";

export const isForeignKeyError = (error: any): boolean => {
  return error.code === "23503";
};

export const isUniqueConstraintError = (error: any): boolean => {
  return error.code === "23505";
};

export const isNotNullConstraintError = (error: any): boolean => {
  return error.code === "23502";
};

export const isCheckConstraintError = (error: any): boolean => {
  return error.code === "23514";
};

interface Query {
  sql: string;
  __queryStartTime: string;
}

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  constructor(@Inject("KNEX_CONNECTION") private readonly knex: Knex) {}

  private setupQueryLogging() {
    const startTimes = new Map<string, number>();

    this.knex.on("query", (query: Query) => {
      startTimes.set(query.__queryStartTime, Date.now());
    });

    this.knex.on("query-response", (_, query: Query) => {
      const startTime = startTimes.get(query.__queryStartTime);
      if (startTime) {
        const duration = Date.now() - startTime;
        const isSlow = duration > 500;
        if (isSlow) {
          this.logger.warn(`[SLOW QUERY] (${duration} ms): ${query.sql}`);
        } else {
          this.logger.log(`[QUERY] (${duration} ms): ${query.sql}`);
        }

        startTimes.delete(query.__queryStartTime);
      }
    });

    this.knex.on("query-error", (error, query: Query) => {
      this.logger.error(`[QUERY ERROR]: ${query.sql}`, error);
    });
  }

  async onModuleInit() {
    try {
      // ping db
      this.setupQueryLogging();
      await this.rawQuery("select 1", []);
      this.logger.log("DatabaseService initialized");
    } catch (error) {
      console.error("Database connection failed:", error);
      throw new Error("Database connection failed");
    }
  }

  async rawQuery<T>(query: string, params: Knex.RawBinding[]): Promise<T> {
    const result = await this.knex.raw(query, params);
    return result.rows as T;
  }

  async insert<T>(
    table: string,
    data: Partial<T> & { id?: string },
    returning?: string[],
  ): Promise<T> {
    if (!data.id) data.id = ulid();
    const result = await this.knex(table)
      .insert(data)
      .returning(returning || "*");
    return result[0] as T;
  }

  async insertMany<T>(
    table: string,
    data: Partial<T>[],
    returning?: string[],
  ): Promise<T[]> {
    if (data.length === 0) return [];
    const result = await this.knex(table)
      .insert(data)
      .returning(returning || "*");
    return result as T[];
  }

  async findOne<T>(table: string, condition: Partial<T>): Promise<T | null> {
    const result = (await this.knex(table)
      .where(condition)
      .first()) as T | null;
    return result;
  }

  async findAll<T>(table: string, condition?: Partial<T>): Promise<T[]> {
    const query = condition
      ? this.knex(table).where(condition)
      : this.knex(table);
    const result = await query.select();
    return result as T[];
  }

  async update<T>(
    table: string,
    condition: Partial<T>,
    data: Partial<T>,
    returning?: string[],
  ): Promise<T | null> {
    const result = await this.knex(table)
      .where(condition)
      .update(data)
      .returning(returning || "*");
    const [updated] = result as T[];
    return updated;
  }

  delete<T>(table: string, condition: Partial<T>): Promise<number> {
    return this.knex(table).where(condition).del();
  }

  beginTransaction(): Promise<Knex.Transaction> {
    return this.knex.transaction();
  }
  async commitTransaction(transaction: Knex.Transaction): Promise<void> {
    await transaction.commit();
  }
  async rollbackTransaction(transaction: Knex.Transaction): Promise<void> {
    await transaction.rollback();
  }

  async transaction<T>(
    callback: (transaction: Knex.Transaction) => Promise<T>,
  ): Promise<T> {
    const transaction = await this.beginTransaction();
    try {
      const result = await callback(transaction);
      await this.commitTransaction(transaction);
      return result;
    } catch (error) {
      await this.rollbackTransaction(transaction);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.knex.destroy();
  }
}
