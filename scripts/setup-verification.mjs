// Add only the verification tables to an existing production database.
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import vaultEnvironment from "../lib/vault-env.cjs";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env.production", quiet: true });
dotenv.config({ quiet: true });
await vaultEnvironment.loadVaultEnv({ application: "business" });
for (const key of ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"]) {
  if (!process.env[key]) throw new Error(`Missing ${key}`);
}
const names = new Set(["te_users", "te_sessions", "te_device_tokens", "customer_verification_requests", "customer_verification_photos", "customer_verification_videos", "customer_verification_references", "verification_result_views", "branch_notifications"]);
const statements = readFileSync(path.join(process.cwd(), "database/schema.sql"), "utf8")
  .split(";").map(statement => statement.trim()).filter(statement => names.has(statement.match(/^CREATE TABLE IF NOT EXISTS (\w+)/)?.[1]));
if (statements.length !== names.size) throw new Error("Verification schema is incomplete.");
const connection = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, charset: "utf8mb4", ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined });
try {
  for (const statement of statements) await connection.query(statement);
  const addColumn = async (table, column, definition) => {
    const [existing] = await connection.query(
      "SELECT 1 FROM information_schema.columns WHERE table_schema=? AND table_name=? AND column_name=? LIMIT 1",
      [process.env.DB_NAME, table, column],
    );
    if (!existing.length) await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  };
  await addColumn("customers", "recommendation_name", "VARCHAR(190) NULL AFTER old_gold_wearing_image_mime_type");
  await addColumn("customers", "recommendation_relationship", "VARCHAR(120) NULL AFTER recommendation_name");
  await addColumn("customers", "recommendation_phone", "VARCHAR(20) NULL AFTER recommendation_relationship");
  await addColumn("customers", "recommendation_address", "VARCHAR(500) NULL AFTER recommendation_phone");
  for (const table of ["customer_verification_photos", "customer_verification_videos"]) {
    await addColumn(table, "latitude", "DECIMAL(10,7) NULL");
    await addColumn(table, "longitude", "DECIMAL(10,7) NULL");
    await addColumn(table, "captured_at", "DATETIME NULL");
  }
  mkdirSync(path.join(process.cwd(), "storage/verification"), { recursive: true, mode: 0o750 });
  console.log("Verification workflow schema and private upload directory are ready.");
} finally {
  await connection.end();
}
