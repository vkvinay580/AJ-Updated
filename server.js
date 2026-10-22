/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require("node:http");
const { loadEnvConfig } = require("@next/env");
const { loadVaultEnv } = require("./lib/vault-env.cjs");

async function start() {
  const dev = process.env.NODE_ENV !== "production";
  loadEnvConfig(process.cwd(), dev);
  await loadVaultEnv({ application: "business" });
  const next = require("next");
  const hostname = process.env.HOSTNAME || "0.0.0.0";
  const port = Number(process.env.PORT || 3000);
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();
  createServer((request, response) => handle(request, response)).listen(port, hostname, () => {
    console.log(`Aryan Gold is listening on ${hostname}:${port}`);
  });
}

start().catch((error) => {
  console.error("Unable to start Aryan Gold:", error);
  process.exit(1);
});
