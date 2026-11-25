import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { env } from "@/config/env";
import * as schema from "./schema";

const client = postgres(env.DATABASE_URL, { max: 10 });
export const db = drizzle(client, { schema });
export type Db = typeof db;
