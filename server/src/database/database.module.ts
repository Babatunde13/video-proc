import { Module, Global } from "@nestjs/common";
import knex, { Knex } from "knex";
import { DatabaseService } from "./database.service";
import knexConfig from "./knexfile";

@Global()
@Module({
  providers: [
    {
      provide: "KNEX_CONNECTION",
      useFactory: (): Knex => knex(knexConfig),
    },
    DatabaseService,
  ],
  exports: ["KNEX_CONNECTION", DatabaseService],
})
export class DatabaseModule {}
