import { Knex } from "knex";
import envs from "../config/envs";

const config: Knex.Config = {
  client: "pg",
  connection: {
    connectionString: envs.DATABASE_URL,
  },
  pool: { min: 2, max: 20 },
  migrations: {
    tableName: "knex_migrations",
    directory: "./prisma/migrations",
  },
};

export default config;
