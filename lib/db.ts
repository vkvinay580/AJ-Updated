import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

const globalDatabase = globalThis as typeof globalThis & { aryanMysqlPool?: Pool };
const requiredDatabaseVariables = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"] as const;

function assertDatabaseConfig() {
  const missing = requiredDatabaseVariables.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Missing database environment variables: ${missing.join(", ")}`);
}

function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "database-not-configured",
    password: process.env.DB_PASSWORD || "database-not-configured",
    database: process.env.DB_NAME || "database-not-configured",
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    queueLimit: 0,
    charset: "utf8mb4",
    timezone: "Z",
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined,
  });
}

export const pool = globalDatabase.aryanMysqlPool || createPool();
if (process.env.NODE_ENV !== "production") globalDatabase.aryanMysqlPool = pool;

export type DatabaseValue = string | number | boolean | Date | Buffer | null;

export async function rows<T extends RowDataPacket>(sql: string, values: DatabaseValue[] = [], connection: Pool | PoolConnection = pool) {
  assertDatabaseConfig();
  const [result] = await connection.execute<T[]>(sql, values);
  return result;
}

export async function one<T extends RowDataPacket>(sql: string, values: DatabaseValue[] = [], connection: Pool | PoolConnection = pool) {
  const result = await rows<T>(sql, values, connection);
  return result[0] || null;
}

export async function execute(sql: string, values: DatabaseValue[] = [], connection: Pool | PoolConnection = pool) {
  assertDatabaseConfig();
  const [result] = await connection.execute<ResultSetHeader>(sql, values);
  return result;
}

export async function transaction<T>(work: (connection: PoolConnection) => Promise<T>) {
  assertDatabaseConfig();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${digest}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, digest] = stored.split(":");
  if (!salt || !digest) return false;
  const supplied = scryptSync(password, salt, 64);
  const expected = Buffer.from(digest, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function encryptionKey() {
  const configured = process.env.DATA_ENCRYPTION_KEY;
  if (!configured && process.env.NODE_ENV === "production") throw new Error("DATA_ENCRYPTION_KEY is required in production.");
  return createHash("sha256").update(configured || "development-only-change-this-key").digest();
}

export function encryptSensitive(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSensitive(value: string) {
  const [iv, tag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function stableHash(value: string) {
  return createHash("sha256").update(value.trim().toUpperCase()).digest("hex");
}
