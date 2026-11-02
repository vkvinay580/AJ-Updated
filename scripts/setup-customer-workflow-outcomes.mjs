import { readFileSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import vaultEnvironment from "../lib/vault-env.cjs";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env.production") });
dotenv.config();
await vaultEnvironment.loadVaultEnv({ application: "business" });

const required = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"];
const missing = required.filter(name => !process.env[name]);
if (missing.length) throw new Error(`Missing required database variables: ${missing.join(", ")}`);

const schema = readFileSync(path.join(process.cwd(), "database", "schema.sql"), "utf8");
const statement = schema.match(/CREATE TABLE IF NOT EXISTS customer_workflow_outcomes \([\s\S]*?\n\) ENGINE=[^;]+;/)?.[0];
if (!statement) throw new Error("customer_workflow_outcomes schema was not found.");

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: "utf8mb4",
  timezone: "Z",
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined,
});

try {
  await connection.query(statement);
  const [[table]] = await connection.query("SELECT COUNT(*) AS columnCount FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='customer_workflow_outcomes'", [process.env.DB_NAME]);
  if (Number(table.columnCount) !== 9) throw new Error("customer_workflow_outcomes table validation failed.");
  console.log("Customer workflow outcomes table is ready.");
} finally {
  await connection.end();
}
