"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const { existsSync, readFileSync, statSync } = require("node:fs");
const { homedir } = require("node:os");
const http = require("node:http");
const https = require("node:https");
const path = require("node:path");

const DEFAULT_TIMEOUT_MS = 5000;

function readCredential(file, label) {
  try {
    if ((statSync(file).mode & 0o077) !== 0) {
      throw new Error(`${label} file must be readable only by its owner`);
    }
    const value = readFileSync(file, "utf8").trim();
    if (!value) throw new Error(`${label} file is empty`);
    return value;
  } catch (error) {
    throw new Error(`Unable to read Vault ${label} file ${file}: ${error.message}`);
  }
}

function vaultRequest(address, pathname, { method = "GET", token, body, namespace, timeoutMs } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathname, address.endsWith("/") ? address : `${address}/`);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      reject(new Error("Vault address must be an HTTP(S) URL without credentials"));
      return;
    }
    const transport = url.protocol === "https:" ? https : http;
    const payload = body === undefined ? undefined : Buffer.from(JSON.stringify(body));
    const headers = { Accept: "application/json" };
    if (payload) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = String(payload.length);
    }
    if (token) headers["X-Vault-Token"] = token;
    if (namespace) headers["X-Vault-Namespace"] = namespace;

    const request = transport.request(url, { method, headers, timeout: timeoutMs }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        let parsed = {};
        try {
          parsed = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
        } catch {
          reject(new Error(`Vault returned invalid JSON (HTTP ${response.statusCode})`));
          return;
        }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          const details = Array.isArray(parsed.errors) ? parsed.errors.join("; ") : "request failed";
          reject(new Error(`Vault request failed (HTTP ${response.statusCode}): ${details}`));
          return;
        }
        resolve(parsed);
      });
    });
    request.on("timeout", () => request.destroy(new Error("Vault request timed out")));
    request.on("error", reject);
    if (payload) request.write(payload);
    request.end();
  });
}

function defaultCredentialFile(application, filename) {
  return path.join(homedir(), ".config", "aryangold-vault", application, filename);
}

async function loadVaultEnv(options = {}) {
  const application = options.application || process.env.VAULT_APPLICATION || "business";
  const roleIdFile = options.roleIdFile || process.env.VAULT_ROLE_ID_FILE || defaultCredentialFile(application, "role-id");
  const secretIdFile = options.secretIdFile || process.env.VAULT_SECRET_ID_FILE || defaultCredentialFile(application, "secret-id");
  const required = options.required ?? process.env.VAULT_REQUIRED === "true";
  const enabled = options.enabled ?? (
    required ||
    process.env.VAULT_ENABLED === "true" ||
    process.env.VAULT_ROLE_ID_FILE !== undefined ||
    process.env.VAULT_SECRET_ID_FILE !== undefined ||
    (existsSync(roleIdFile) && existsSync(secretIdFile))
  );

  if (!enabled) return { loaded: false, reason: "disabled" };
  if (!existsSync(roleIdFile) || !existsSync(secretIdFile)) {
    if (!required) return { loaded: false, reason: "credentials-not-found" };
    throw new Error("Vault is required, but its AppRole credential files are missing");
  }

  const address = options.address || process.env.VAULT_ADDR || "http://127.0.0.1:8200";
  const secretPath = options.secretPath || process.env.VAULT_SECRET_PATH || `secret/data/apps/${application}`;
  if (secretPath.includes("..") || !/^[A-Za-z0-9_./-]+$/.test(secretPath)) {
    throw new Error("VAULT_SECRET_PATH contains unsupported characters");
  }
  const timeoutMs = Number(options.timeoutMs || process.env.VAULT_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) {
    throw new Error("VAULT_TIMEOUT_MS must be between 1 and 60000");
  }
  const namespace = options.namespace || process.env.VAULT_NAMESPACE;
  const requestOptions = { namespace, timeoutMs };
  const roleId = readCredential(roleIdFile, "role-id");
  const secretId = readCredential(secretIdFile, "secret-id");

  const login = await vaultRequest(address, "/v1/auth/approle/login", {
    ...requestOptions,
    method: "POST",
    body: { role_id: roleId, secret_id: secretId },
  });
  const token = login?.auth?.client_token;
  if (!token) throw new Error("Vault AppRole login returned no client token");

  try {
    const response = await vaultRequest(address, `/v1/${secretPath.replace(/^\/+/, "")}`, {
      ...requestOptions,
      token,
    });
    const values = response?.data?.data;
    if (!values || typeof values !== "object" || Array.isArray(values)) {
      throw new Error("Vault KV response did not contain a secret object");
    }
    let count = 0;
    for (const [name, value] of Object.entries(values)) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || value === null || value === undefined) continue;
      if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") continue;
      process.env[name] = String(value);
      count += 1;
    }
    return { loaded: true, count, application, secretPath };
  } finally {
    try {
      await vaultRequest(address, "/v1/auth/token/revoke-self", {
        ...requestOptions,
        method: "POST",
        token,
      });
    } catch {
      // The short-lived token is still bounded by its Vault TTL if revocation fails.
    }
  }
}

module.exports = { loadVaultEnv, vaultRequest };
