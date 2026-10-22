"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const assert = require("node:assert/strict");
const { mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const http = require("node:http");
const { tmpdir } = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { loadEnvConfig, resetEnv } = require("@next/env");
const { loadVaultEnv } = require("../lib/vault-env.cjs");

test("loads a KV v2 secret through AppRole and revokes the temporary token", async () => {
  const scratch = mkdtempSync(path.join(tmpdir(), "aryan-vault-test-"));
  const roleIdFile = path.join(scratch, "role-id");
  const secretIdFile = path.join(scratch, "secret-id");
  writeFileSync(roleIdFile, "test-role\n", { mode: 0o600 });
  writeFileSync(secretIdFile, "test-secret\n", { mode: 0o600 });
  const requests = [];
  const server = http.createServer((request, response) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      requests.push({ url: request.url, token: request.headers["x-vault-token"], body: Buffer.concat(chunks).toString("utf8") });
      response.setHeader("Content-Type", "application/json");
      if (request.url === "/v1/auth/approle/login") response.end(JSON.stringify({ auth: { client_token: "temporary-token" } }));
      else if (request.url === "/v1/secret/data/apps/test") response.end(JSON.stringify({ data: { data: { TEST_VAULT_SECRET: "loaded" } } }));
      else if (request.url === "/v1/auth/token/revoke-self") response.end("{}");
      else { response.statusCode = 404; response.end(JSON.stringify({ errors: ["not found"] })); }
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const address = `http://127.0.0.1:${server.address().port}`;
    const result = await loadVaultEnv({
      application: "test",
      address,
      secretPath: "secret/data/apps/test",
      roleIdFile,
      secretIdFile,
      required: true,
    });
    assert.equal(result.loaded, true);
    assert.equal(process.env.TEST_VAULT_SECRET, "loaded");
    assert.deepEqual(requests.map((request) => request.url), [
      "/v1/auth/approle/login",
      "/v1/secret/data/apps/test",
      "/v1/auth/token/revoke-self",
    ]);
    assert.equal(JSON.parse(requests[0].body).secret_id, "test-secret");
    assert.equal(requests[1].token, "temporary-token");
  } finally {
    delete process.env.TEST_VAULT_SECRET;
    await new Promise((resolve) => server.close(resolve));
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("fails closed when Vault is required and AppRole files are absent", async () => {
  await assert.rejects(
    loadVaultEnv({
      application: "missing",
      roleIdFile: "/tmp/aryan-vault-test-missing-role",
      secretIdFile: "/tmp/aryan-vault-test-missing-secret",
      required: true,
    }),
    /credential files are missing/,
  );
});

test("loads production Vault bootstrap metadata before enforcing required mode", async () => {
  const scratch = mkdtempSync(path.join(tmpdir(), "aryan-vault-env-test-"));
  const roleIdFile = path.join(scratch, "missing-role-id");
  const secretIdFile = path.join(scratch, "missing-secret-id");
  writeFileSync(path.join(scratch, ".env.production"), [
    "VAULT_REQUIRED=true",
    `VAULT_ROLE_ID_FILE=${roleIdFile}`,
    `VAULT_SECRET_ID_FILE=${secretIdFile}`,
    "",
  ].join("\n"));

  try {
    loadEnvConfig(scratch, false, console, true);
    await assert.rejects(loadVaultEnv({ application: "business" }), /credential files are missing/);
  } finally {
    resetEnv();
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("rejects AppRole credential files readable by other users", async () => {
  const scratch = mkdtempSync(path.join(tmpdir(), "aryan-vault-permission-test-"));
  const roleIdFile = path.join(scratch, "role-id");
  const secretIdFile = path.join(scratch, "secret-id");
  writeFileSync(roleIdFile, "test-role\n", { mode: 0o644 });
  writeFileSync(secretIdFile, "test-secret\n", { mode: 0o600 });

  try {
    await assert.rejects(
      loadVaultEnv({ application: "test", roleIdFile, secretIdFile, required: true }),
      /readable only by its owner/,
    );
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("rejects Vault URLs containing embedded credentials", async () => {
  const scratch = mkdtempSync(path.join(tmpdir(), "aryan-vault-url-test-"));
  const roleIdFile = path.join(scratch, "role-id");
  const secretIdFile = path.join(scratch, "secret-id");
  writeFileSync(roleIdFile, "test-role\n", { mode: 0o600 });
  writeFileSync(secretIdFile, "test-secret\n", { mode: 0o600 });

  try {
    await assert.rejects(
      loadVaultEnv({
        application: "test",
        address: "http://username:password@127.0.0.1:8200",
        roleIdFile,
        secretIdFile,
        required: true,
      }),
      /without credentials/,
    );
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
