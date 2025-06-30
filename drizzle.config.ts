import { defineConfig } from "drizzle-kit";
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("SUPABASE_DB_URL or DATABASE_URL not set. Please configure Supabase connection.");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
