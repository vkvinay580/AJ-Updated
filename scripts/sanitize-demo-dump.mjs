import { readFileSync, writeFileSync } from "node:fs";

const [source, destination] = process.argv.slice(2);
if (!source || !destination) {
  throw new Error("Usage: node scripts/sanitize-demo-dump.mjs <source.sql> <destination.sql>");
}

const transientTables = new Set([
  "accounts_sessions",
  "branch_sessions",
  "head_office_sessions",
  "sessions",
  "te_device_tokens",
  "te_sessions",
]);

const lines = readFileSync(source, "utf8").split("\n");
const sanitized = [];
let skippedTable = null;

for (const line of lines) {
  if (skippedTable) {
    if (line.endsWith(";")) {
      sanitized.push(`-- Rows from ${skippedTable} were removed from the public demo snapshot.`);
      skippedTable = null;
    }
    continue;
  }

  const insert = line.match(/^INSERT INTO `([^`]+)` VALUES$/);
  if (insert && transientTables.has(insert[1])) {
    skippedTable = insert[1];
    continue;
  }

  sanitized.push(line);
}

if (skippedTable) throw new Error(`Unterminated INSERT statement for ${skippedTable}`);

let output = [
  "-- Public demo database snapshot.",
  "-- Authentication sessions and device tokens are omitted; stored passwords are disabled.",
  "",
  sanitized.join("\n"),
].join("\n");
output = output.replace(
  /\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/g,
  "!PUBLIC_DEMO_SNAPSHOT_PASSWORD_DISABLED!",
);
output = output.replace(
  /\$argon2(?:id|i|d)\$[^'"\\s,)]+/g,
  "!PUBLIC_DEMO_SNAPSHOT_PASSWORD_DISABLED!",
);
output = output.replace(
  /\b[0-9a-f]{32}:[0-9a-f]{128}\b/gi,
  "!PUBLIC_DEMO_SNAPSHOT_PASSWORD_DISABLED!",
);
output = `${output
  .split("\n")
  .map((line) => line.replace(/[ \t]+$/u, ""))
  .join("\n")
  .replace(/\n*$/u, "")}\n`;

writeFileSync(destination, output, { mode: 0o644 });
