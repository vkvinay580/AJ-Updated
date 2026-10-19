// Add only the verification tables to an existing production database.
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env.production", quiet: true });
dotenv.config({ quiet: true });
for (const key of ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"]) {
  if (!process.env[key]) throw new Error(`Missing ${key}`);
}
const names = new Set(["te_users", "te_sessions", "te_device_tokens", "customer_verification_requests", "customer_verification_photos", "customer_verification_videos", "customer_verification_references", "branch_notifications"]);
const statements = readFileSync(path.join(process.cwd(), "database/schema.sql"), "utf8")
  .split(";").map(statement => statement.trim()).filter(statement => names.has(statement.match(/^CREATE TABLE IF NOT EXISTS (\w+)/)?.[1]));
if (statements.length !== names.size) throw new Error("Verification schema is incomplete.");
const connection = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, charset: "utf8mb4", ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined });
try {
  for (const statement of statements) await connection.query(statement);
  mkdirSync(path.join(process.cwd(), "storage/verification"), { recursive: true, mode: 0o750 });
  console.log("Eight verification tables and private upload directory are ready.");
} finally {
  await connection.end();
}
