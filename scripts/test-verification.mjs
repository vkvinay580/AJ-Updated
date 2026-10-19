// Integration test: starts an isolated MariaDB instance and the production app.
// Requires a completed npm run build, mariadb-install-db and mariadbd on PATH.
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes, createHash, scryptSync } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import mysql from "mysql2/promise";

const scratch = await mkdtemp(path.join(tmpdir(), "aryan-verification-test-"));
const socket = path.join(scratch, "mysql.sock");
const dbPort = Number(process.env.VERIFICATION_TEST_DB_PORT || 33417);
const port = Number(process.env.VERIFICATION_TEST_PORT || 3137);
const base = `http://127.0.0.1:${port}`;
const password = randomBytes(24).toString("hex");
const hash = value => createHash("sha256").update(value).digest("hex");
const passwordHash = value => { const salt = randomBytes(16).toString("hex"); return `${salt}:${scryptSync(value, salt, 64).toString("hex")}`; };
let database, application, sql;
let serverOutput = "";

async function eventually(check, label) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if (await check()) return; } catch {}
    await delay(250);
  }
  throw new Error(`${label} did not start. ${serverOutput.slice(-3000)}`);
}
async function call(url, { cookie, token, method = "GET", body, expected = 200 } = {}) {
  const headers = {};
  if (cookie) headers.Cookie = cookie;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !(body instanceof FormData)) headers["Content-Type"] = "application/json";
  const response = await fetch(`${base}${url}`, { method, headers, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  assert.equal(response.status, expected, `${method} ${url}: ${JSON.stringify(data)}`);
  return data;
}
async function stop(child) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([new Promise(resolve => child.once("exit", resolve)), delay(5000)]);
}
try {
  execFileSync("mariadb-install-db", ["--no-defaults", `--datadir=${scratch}`, "--auth-root-authentication-method=normal", "--skip-test-db"], { stdio: "pipe" });
  database = spawn("mariadbd", ["--no-defaults", `--datadir=${scratch}`, `--socket=${socket}`, `--pid-file=${scratch}/mysql.pid`, `--log-error=${scratch}/mysql.log`, "--bind-address=127.0.0.1", `--port=${dbPort}`, "--innodb-buffer-pool-size=64M"], { stdio: "ignore" });
  await eventually(async () => { sql = await mysql.createConnection({ socketPath: socket, user: "root", multipleStatements: true }); return true; }, "Test database");
  await sql.query("CREATE DATABASE verification_test");
  await sql.query("CREATE USER 'verification_test'@'127.0.0.1' IDENTIFIED BY ?", [password]);
  await sql.query("GRANT ALL ON verification_test.* TO 'verification_test'@'127.0.0.1'");
  await sql.query("USE verification_test");
  const schema = await readFile("database/schema.sql", "utf8");
  await sql.query(schema);
  await sql.query(schema);
  console.log("PASS: schema creates cleanly and is idempotent");
  await sql.query("INSERT INTO companies (id,slug,name,short_name,logo_path,invoice_prefix) VALUES (1,'aryan-gold','Test Gold','AG','/brands/aryan-gold.png','AG'),(2,'test-other','Other Company','OT','/brands/aryan-gold.png','OT')");
  await sql.query("INSERT INTO admins (id,email,name,password_hash) VALUES (1,'verification-test@example.invalid','Test Admin',?)", [passwordHash(password)]);
  await sql.query("INSERT INTO admin_company_access VALUES (1,1),(1,2)");
  const adminToken = randomBytes(32).toString("hex"), otherToken = randomBytes(32).toString("hex");
  await sql.query("INSERT INTO sessions (token_hash,admin_id,company_id,expires_at) VALUES (?,1,1,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 HOUR)),(?,1,2,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 HOUR))", [hash(adminToken), hash(otherToken)]);
  const admin = `aryan_admin_session=${adminToken}`, other = `aryan_admin_session=${otherToken}`;
  const bmToken = randomBytes(32).toString("hex"), otherBmToken = randomBytes(32).toString("hex");
  await sql.query("INSERT INTO branch_sessions (token_hash,branch_id,branch_name,employee_id,employee_name,expires_at) VALUES (?,'TEST-BRANCH','Test Branch','TEST-BM','Test Manager',DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 HOUR)),(?,'TEST-BRANCH','Test Branch','OTHER-BM','Other Manager',DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 HOUR))", [hash(bmToken), hash(otherBmToken)]);
  const bm = `aryan_branch_session=${bmToken}`, otherBm = `aryan_branch_session=${otherBmToken}`;
  await sql.query("INSERT INTO customers (id,company_id,phone,name,address) VALUES (1,1,'9000000001','Test Customer','Test home address'),(2,2,'9000000002','Other Company Customer','Other address')");
  application = spawn(process.execPath, ["server.js"], { env: { ...process.env, NODE_ENV: "production", HOSTNAME: "127.0.0.1", PORT: String(port), DB_HOST: "127.0.0.1", DB_PORT: String(dbPort), DB_USER: "verification_test", DB_PASSWORD: password, DB_NAME: "verification_test", DATA_ENCRYPTION_KEY: password, FIREBASE_PROJECT_ID: "", FIREBASE_CLIENT_EMAIL: "", FIREBASE_PRIVATE_KEY: "" }, stdio: ["ignore", "pipe", "pipe"] });
  application.stdout.on("data", data => { serverOutput += data; });
  application.stderr.on("data", data => { serverOutput += data; });
  await eventually(async () => (await fetch(`${base}/login`)).ok, "Application");
  assert.match(await (await fetch(`${base}/login`)).text(), /\/downloads\/aryan-verification\.apk/);
  console.log("PASS: login portal advertises the TE download");
  await call("/api/verification/requests", { expected: 401 });
  await call("/api/admin/verifications", { expected: 401 });
  const te = await call("/api/admin/verifications", { cookie: admin, method: "POST", body: { action: "create-te", userId: "test.te", name: "Test TE", phone: "9000000003", password }, expected: 201 });
  const secondTe = await call("/api/admin/verifications", { cookie: admin, method: "POST", body: { action: "create-te", userId: "test.other", name: "Other TE", password }, expected: 201 });
  const { token } = await call("/api/verification/login", { method: "POST", body: { userId: "test.te", password } });
  const { token: secondToken } = await call("/api/verification/login", { method: "POST", body: { userId: "test.other", password } });
  await call("/api/branch/verifications", { cookie: bm, method: "POST", body: { customerId: 2, teUserId: te.id, bmPhone: "9000000004" }, expected: 404 });
  const assignBody = { customerId: 1, teUserId: te.id, bmPhone: "9000000004", notes: "Visit test home" };
  const concurrent = await Promise.all([0,1].map(() => fetch(`${base}/api/branch/verifications`, { method: "POST", headers: { Cookie: bm, "Content-Type": "application/json" }, body: JSON.stringify(assignBody) })));
  assert.deepEqual(concurrent.map(response => response.status).sort(), [201,409]);
  const { requestId } = await concurrent.find(response => response.status === 201).json();
  const assignments = await call("/api/verification/requests", { token });
  assert.equal(assignments.requests.length, 1);
  assert.equal(assignments.requests[0].bmPhone, "9000000004");
  assert.equal(assignments.requests[0].customerAddress, "Test home address");
  assert.equal((await call("/api/verification/requests", { token: secondToken })).requests.length, 0);
  await call("/api/verification/requests", { token: secondToken, method: "POST", body: { id: requestId }, expected: 404 });
  console.log("PASS: TE login, assigned customer/BM details, company isolation and concurrent duplicate prevention");
  await call("/api/verification/requests", { token, method: "POST", body: { id: requestId } });
  const invalid = new FormData(); invalid.set("id", String(requestId)); invalid.set("outcome", "verified");
  await call("/api/verification/requests", { token, method: "POST", body: invalid, expected: 400 });
  const invalidVideo = new FormData();
  for (const [key,value] of Object.entries({ id: String(requestId), outcome: "could_not_verify", failureReason: "Video validation test" })) invalidVideo.set(key,value);
  invalidVideo.set("video", new Blob([Buffer.from("0000ftyp-not-a-video")], { type: "video/mp4" }), "invalid.mp4");
  await call("/api/verification/requests", { token, method: "POST", body: invalidVideo, expected: 400 });
  const completed = new FormData();
  for (const [key,value] of Object.entries({ id: String(requestId), outcome: "verified", authenticationPersonName: "Test Witness", authenticationPersonPhone: "9000000005", references: JSON.stringify([{ name: "Test Reference", relationship: "Neighbour", phone: "9000000006" }]) })) completed.set(key,value);
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1ioAAAAASUVORK5CYII=", "base64");
  completed.append("photos", new Blob([png], { type: "image/png" }), "visit-one.png");
  completed.append("photos", new Blob([png], { type: "image/png" }), "visit-two.png");
  await call("/api/verification/requests", { token, method: "POST", body: completed });
  await call("/api/verification/requests", { token, method: "POST", body: completed, expected: 409 });
  const profile = await call("/api/admin/customers/1", { cookie: admin });
  assert.equal(profile.verifications[0].status, "verified");
  assert.equal(profile.verificationPhotos.length, 2);
  assert.equal(profile.verificationVideos.length, 0);
  assert.equal(profile.verificationReferences.length, 1);
  const photoPath = `/api/admin/verifications/${requestId}/photos/${profile.verificationPhotos[0].id}`;
  assert.equal((await fetch(`${base}${photoPath}`, { headers: { Cookie: admin } })).status, 200);
  await call(photoPath, { expected: 401 });
  await call(photoPath, { cookie: other, expected: 404 });
  const notices = (await call("/api/branch/verifications", { cookie: bm })).notifications;
  assert.equal(notices.length, 1);
  assert.equal((await call("/api/branch/verifications", { cookie: otherBm })).notifications.length, 0);
  await call("/api/branch/verifications", { cookie: bm, method: "PATCH", body: { notificationId: notices[0].id } });
  assert.ok((await call("/api/branch/verifications", { cookie: bm })).notifications[0].readAt);
  console.log("PASS: verified evidence, KYC results, protected photo delivery, duplicate completion and BM-only notification/read state");
  const retry = await call("/api/branch/verifications", { cookie: bm, method: "POST", body: assignBody, expected: 201 });
  const failed = new FormData(); failed.set("id", String(retry.requestId)); failed.set("outcome", "could_not_verify");
  await call("/api/verification/requests", { token, method: "POST", body: failed, expected: 400 });
  failed.set("failureReason", "No one present during visit");
  await call("/api/verification/requests", { token, method: "POST", body: failed });
  assert.equal((await call("/api/branch/verifications", { cookie: bm })).notifications.length, 2);
  const registration = new FormData();
  for (const [key,value] of Object.entries({ phone: "9000000007", name: "Registration Verification Customer", aadhaar: "111122223333",
    address: "New customer test home", requestHouseVerification: "1", verificationTeUserId: String(secondTe.id),
    verificationBmPhone: "9000000004", verificationNotes: "Requested during customer registration" })) registration.set(key,value);
  const registered = await call("/api/branch/customers", { cookie: bm, method: "POST", body: registration, expected: 201 });
  assert.ok(registered.customerId);
  assert.ok(registered.verificationRequestId);
  assert.match(registered.verificationMessage, /House verification assigned/);
  const registrationAssignments = await call("/api/verification/requests", { token: secondToken });
  assert.ok(registrationAssignments.requests.some(request => request.id === registered.verificationRequestId && request.customerName === "Registration Verification Customer"));
  console.log("PASS: branch customer registration atomically creates and assigns an optional house verification request");
  await call("/api/admin/verifications", { cookie: admin, method: "POST", body: { action: "update-te", id: te.id, name: "Test TE", active: false } });
  await call("/api/verification/requests", { token, expected: 401 });
  await call("/api/verification/login", { method: "POST", body: { userId: "test.te", password }, expected: 401 });
  assert.ok(secondTe.id);
  await call("/api/admin/customers/1", { cookie: admin, method: "DELETE" });
  const [remaining] = await sql.query("SELECT COUNT(*) AS count FROM customer_verification_photos");
  assert.equal(remaining[0].count, 0);
  console.log("PASS: failure reason validation, could-not-verify result, disabled TE revocation and cascading evidence cleanup");
  console.log("All verification integration checks passed.");
} finally {
  await stop(application);
  if (sql) await sql.end();
  await stop(database);
  console.log(`Isolated test database artifacts retained at ${scratch}`);
}
