import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type MiscRole = "admin" | "acc";

export type MiscUser = {
  id: string;
  username: string;
  displayName: string;
  role: MiscRole;
  active: boolean;
};

type StoredMiscUser = MiscUser & { passwordHash: string };

type LoginFile = {
  version: 1;
  users: StoredMiscUser[];
};

export type MiscEntry = {
  id: string;
  date: string;
  time: string;
  name: string;
  valuePaise: number;
  description: string;
  createdAt: string;
  createdBy: string;
};

type EntryFile = {
  version: 1;
  entries: (Omit<MiscEntry, "time" | "description"> & { time?: string; description?: string; reason?: string })[];
};

const FILE_MAGIC = Buffer.from("AGMISC01");
const INITIAL_PASSWORD_HASH = "scrypt:QbpjqDZYmRokWte7QfT0KQ:AusEnx6RQfgAlr8fhGsT0sd8Mn91wBbCbsrLJKnqe20qZMLJ0ObIEZS9j18bFc-0PFjT3GYeZIAbTehWgi3pBg";
const storageDirectory = path.resolve(process.env.MISC_STORAGE_DIRECTORY || path.join(process.cwd(), "storage", "misc", "data", "php", "data", "extra"));
const loginFilePath = path.join(storageDirectory, "login.dat");
const entryFilePath = path.join(storageDirectory, "entries.dat");

const globalMiscStore = globalThis as typeof globalThis & { miscFileQueue?: Promise<void> };

function masterSecret() {
  const configured = process.env.MISC_ENCRYPTION_KEY || process.env.DATA_ENCRYPTION_KEY;
  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error("MISC_ENCRYPTION_KEY or DATA_ENCRYPTION_KEY is required in production.");
  }
  return configured || "development-only-misc-key-change-before-production";
}

function keyFor(purpose: string) {
  return createHash("sha256").update(masterSecret()).update("\0aryan-gold:misc:").update(purpose).digest();
}

function encryptJson(value: unknown, purpose: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFor(purpose), iv);
  cipher.setAAD(Buffer.from(`aryan-gold:misc:${purpose}:v1`));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([FILE_MAGIC, iv, cipher.getAuthTag(), ciphertext]);
}

function decryptJson<T>(contents: Buffer, purpose: string): T {
  if (contents.length < FILE_MAGIC.length + 12 + 16 || !contents.subarray(0, FILE_MAGIC.length).equals(FILE_MAGIC)) {
    throw new Error("Invalid encrypted misc data file.");
  }
  const ivStart = FILE_MAGIC.length;
  const tagStart = ivStart + 12;
  const dataStart = tagStart + 16;
  const decipher = createDecipheriv("aes-256-gcm", keyFor(purpose), contents.subarray(ivStart, tagStart));
  decipher.setAAD(Buffer.from(`aryan-gold:misc:${purpose}:v1`));
  decipher.setAuthTag(contents.subarray(tagStart, dataStart));
  const plaintext = Buffer.concat([decipher.update(contents.subarray(dataStart)), decipher.final()]).toString("utf8");
  return JSON.parse(plaintext) as T;
}

async function readEncryptedFile<T>(filePath: string, purpose: string): Promise<T | null> {
  try {
    return decryptJson<T>(await readFile(filePath), purpose);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function writeEncryptedFile(filePath: string, value: unknown, purpose: string) {
  await mkdir(storageDirectory, { recursive: true, mode: 0o700 });
  await chmod(storageDirectory, 0o700);
  const temporaryPath = `${filePath}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`;
  await writeFile(temporaryPath, encryptJson(value, purpose), { mode: 0o600, flag: "wx" });
  await rename(temporaryPath, filePath);
  await chmod(filePath, 0o600);
}

function serialized<T>(operation: () => Promise<T>): Promise<T> {
  const previous = globalMiscStore.miscFileQueue || Promise.resolve();
  const current = previous.then(operation, operation);
  globalMiscStore.miscFileQueue = current.then(() => undefined, () => undefined);
  return current;
}

function verifyPassword(password: string, stored: string) {
  const [algorithm, encodedSalt, encodedDigest] = stored.split(":");
  if (algorithm !== "scrypt" || !encodedSalt || !encodedDigest) return false;
  const expected = Buffer.from(encodedDigest, "base64url");
  const supplied = scryptSync(password, Buffer.from(encodedSalt, "base64url"), expected.length);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

async function ensureLoginFile() {
  const existing = await readEncryptedFile<LoginFile>(loginFilePath, "logins");
  if (existing) return existing;

  const initial: LoginFile = {
    version: 1,
    users: [
      { id: randomUUID(), username: "admin", displayName: "Misc Admin", role: "admin", active: true, passwordHash: INITIAL_PASSWORD_HASH },
      { id: randomUUID(), username: "acc", displayName: "Accounts Entry", role: "acc", active: true, passwordHash: INITIAL_PASSWORD_HASH },
    ],
  };
  await writeEncryptedFile(loginFilePath, initial, "logins");
  return initial;
}

export async function authenticateMiscUser(username: string, password: string): Promise<MiscUser | null> {
  return serialized(async () => {
    const file = await ensureLoginFile();
    const user = file.users.find((candidate) => candidate.active && candidate.username.toLowerCase() === username.toLowerCase());
    if (!user || !verifyPassword(password, user.passwordHash)) return null;
    const { passwordHash: _passwordHash, ...safeUser } = user;
    void _passwordHash;
    return safeUser;
  });
}

export async function listMiscEntries() {
  const file = await readEncryptedFile<EntryFile>(entryFilePath, "entries");
  return (file?.entries || []).map((entry): MiscEntry => {
    const { reason, ...stored } = entry;
    return {
      ...stored,
      time: entry.time || new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(entry.createdAt)),
      description: entry.description || reason || "",
    };
  }).sort((left, right) =>
    right.date.localeCompare(left.date) || right.time.localeCompare(left.time) || right.createdAt.localeCompare(left.createdAt),
  );
}

export async function addMiscEntry(input: Omit<MiscEntry, "id" | "createdAt">) {
  return serialized(async () => {
    const file = await readEncryptedFile<EntryFile>(entryFilePath, "entries") || { version: 1 as const, entries: [] };
    const entry: MiscEntry = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    file.entries.push(entry);
    await writeEncryptedFile(entryFilePath, file, "entries");
    return entry;
  });
}

export function sealMiscValue(value: unknown, purpose: string) {
  return encryptJson(value, `token:${purpose}`).toString("base64url");
}

export function openMiscValue<T>(value: string, purpose: string): T | null {
  try {
    return decryptJson<T>(Buffer.from(value, "base64url"), `token:${purpose}`);
  } catch {
    return null;
  }
}
