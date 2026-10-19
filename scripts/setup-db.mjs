import { scryptSync, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env.production") });
dotenv.config();

const required = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME", "DATA_ENCRYPTION_KEY", "INITIAL_ADMIN_EMAIL", "INITIAL_ADMIN_PASSWORD"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: "utf8mb4",
  multipleStatements: true,
});

try {
  const schema = readFileSync(path.join(process.cwd(), "database", "schema.sql"), "utf8");
  await connection.query(schema);
  const [existingHeadOfficeColumns] = await connection.query("SHOW COLUMNS FROM head_office_users");
  await connection.query("ALTER TABLE head_office_users MODIFY COLUMN role ENUM('auditor','melter','floor') NOT NULL");
  if (!existingHeadOfficeColumns.some((column) => column.Field === "operations_admin_id")) {
    await connection.query("ALTER TABLE head_office_users ADD COLUMN operations_admin_id INT UNSIGNED NULL AFTER role");
  }
  const [headOfficeOperationsForeignKeys] = await connection.query("SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=? AND TABLE_NAME='head_office_users' AND CONSTRAINT_NAME='fk_head_office_operations_admin'", [process.env.DB_NAME]);
  if (!headOfficeOperationsForeignKeys.length) {
    await connection.query("ALTER TABLE head_office_users ADD CONSTRAINT fk_head_office_operations_admin FOREIGN KEY (operations_admin_id) REFERENCES admins(id) ON DELETE SET NULL");
  }
  const billColumns = [
    ["account_number", "TEXT NULL"], ["ifsc_code", "VARCHAR(11) NULL"], ["upi_id", "VARCHAR(100) NULL"],
    ["cheque_number", "VARCHAR(20) NULL"], ["card_number", "TEXT NULL"], ["ornament_image_path", "VARCHAR(255) NULL"],
    ["signature_image_path", "VARCHAR(255) NULL"], ["release_place", "VARCHAR(190) NULL AFTER notes"],
    ["release_amount_paise", "BIGINT UNSIGNED NULL AFTER release_place"],
  ];
  const [existingBillColumns] = await connection.query("SHOW COLUMNS FROM bills");
  const existingColumnNames = new Set(existingBillColumns.map((column) => column.Field));
  for (const [name, definition] of billColumns) {
    if (!existingColumnNames.has(name)) await connection.query(`ALTER TABLE bills ADD COLUMN ${name} ${definition}`);
  }
  const paymentColumns = [
    ["account_number", "TEXT NULL AFTER reference_text"], ["ifsc_code", "VARCHAR(11) NULL AFTER account_number"],
    ["upi_id", "VARCHAR(100) NULL AFTER ifsc_code"],
    ["payment_status", "ENUM('not_required','pending','paid') NOT NULL DEFAULT 'not_required' AFTER upi_id"],
    ["utr_number", "VARCHAR(100) NULL AFTER payment_status"],
    ["paid_by_account_user_id", "INT UNSIGNED NULL AFTER utr_number"], ["paid_at", "DATETIME NULL AFTER paid_by_account_user_id"],
  ];
  const [existingPaymentColumns] = await connection.query("SHOW COLUMNS FROM bill_payments");
  const existingPaymentColumnNames = new Set(existingPaymentColumns.map((column) => column.Field));
  for (const [name, definition] of paymentColumns) {
    if (!existingPaymentColumnNames.has(name)) await connection.query(`ALTER TABLE bill_payments ADD COLUMN ${name} ${definition}`);
  }
  const [paymentStatusIndexes] = await connection.query("SHOW INDEX FROM bill_payments WHERE Key_name='idx_bill_payments_status'");
  if (!paymentStatusIndexes.length) await connection.query("ALTER TABLE bill_payments ADD KEY idx_bill_payments_status (payment_status,payment_method)");
  const [paymentAccountForeignKeys] = await connection.query("SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=? AND TABLE_NAME='bill_payments' AND CONSTRAINT_NAME='fk_bill_payment_accounts_user'", [process.env.DB_NAME]);
  if (!paymentAccountForeignKeys.length) await connection.query("ALTER TABLE bill_payments ADD CONSTRAINT fk_bill_payment_accounts_user FOREIGN KEY (paid_by_account_user_id) REFERENCES accounts_users(id) ON DELETE SET NULL");
  await connection.query("UPDATE bill_payments SET payment_status='pending' WHERE payment_method IN ('upi','bank_transfer') AND payment_status='not_required'");
  await connection.query(`INSERT INTO bill_payments
    (bill_id,payment_method,amount_paise,reference_text,account_number,ifsc_code,upi_id,payment_status)
    SELECT b.id,b.payment_method,t.amount_paise,
      CASE WHEN b.payment_method='upi' THEN b.upi_id ELSE CONCAT('Bank transfer · IFSC ',COALESCE(b.ifsc_code,'')) END,
      b.account_number,b.ifsc_code,b.upi_id,'pending'
    FROM bills b JOIN branch_transactions t ON t.bill_id=b.id
    WHERE b.payment_method IN ('upi','bank_transfer')
      AND NOT EXISTS(SELECT 1 FROM bill_payments bp WHERE bp.bill_id=b.id)`);
  const [existingItemColumns] = await connection.query("SHOW COLUMNS FROM bill_items");
  if (!existingItemColumns.some((column) => column.Field === "item_description")) {
    await connection.query("ALTER TABLE bill_items ADD COLUMN item_description VARCHAR(190) NULL AFTER description");
  }
  if (!existingItemColumns.some((column) => column.Field === "metal")) {
    await connection.query("ALTER TABLE bill_items ADD COLUMN metal ENUM('gold','silver') NOT NULL DEFAULT 'gold' AFTER purity");
    await connection.query("UPDATE bill_items SET metal='silver' WHERE LOWER(description) LIKE '%silver%'");
  }
  if (!existingItemColumns.some((column) => column.Field === "gross_weight_mg")) {
    await connection.query("ALTER TABLE bill_items ADD COLUMN gross_weight_mg BIGINT NOT NULL DEFAULT 0 AFTER metal");
    await connection.query("UPDATE bill_items SET gross_weight_mg=weight_mg WHERE gross_weight_mg=0");
  }
  if (!existingItemColumns.some((column) => column.Field === "stone_weight_mg")) {
    await connection.query("ALTER TABLE bill_items ADD COLUMN stone_weight_mg BIGINT NOT NULL DEFAULT 0 AFTER gross_weight_mg");
  }
  await connection.query("UPDATE bill_items SET hsn_code='711319' WHERE hsn_code='710319'");

  const customerWorkingProofColumns = [
    ["employer_name", "VARCHAR(190) NULL AFTER customer_image_path"],
    ["employer_address", "VARCHAR(500) NULL AFTER employer_name"],
    ["employment_designation", "VARCHAR(120) NULL AFTER employer_address"],
    ["company_id_card_path", "VARCHAR(255) NULL AFTER employment_designation"],
    ["company_id_card_original_name", "VARCHAR(255) NULL AFTER company_id_card_path"],
    ["company_id_card_mime_type", "VARCHAR(100) NULL AFTER company_id_card_original_name"],
    ["old_gold_wearing_image_path", "VARCHAR(255) NULL AFTER company_id_card_mime_type"],
    ["old_gold_wearing_image_original_name", "VARCHAR(255) NULL AFTER old_gold_wearing_image_path"],
    ["old_gold_wearing_image_mime_type", "VARCHAR(100) NULL AFTER old_gold_wearing_image_original_name"],
  ];
  const [existingCustomerColumns] = await connection.query("SHOW COLUMNS FROM customers");
  const existingCustomerColumnNames = new Set(existingCustomerColumns.map((column) => column.Field));
  for (const [name, definition] of customerWorkingProofColumns) {
    if (!existingCustomerColumnNames.has(name)) await connection.query(`ALTER TABLE customers ADD COLUMN ${name} ${definition}`);
  }

  const [existingTransactionColumns] = await connection.query("SHOW COLUMNS FROM branch_transactions");
  const transactionColumnNames = new Set(existingTransactionColumns.map((column) => column.Field));
  const transactionColumns = [
    ["business_mode", "ENUM('walkin','pledged') NOT NULL DEFAULT 'walkin' AFTER transaction_type"],
    ["pledge_amount_paise", "BIGINT UNSIGNED NULL AFTER amount_paise"],
    ["release_place", "VARCHAR(190) NULL AFTER pledge_amount_paise"],
    ["release_amount_paise", "BIGINT UNSIGNED NULL AFTER release_place"],
    ["pledge_document_path", "VARCHAR(255) NULL AFTER pledge_amount_paise"],
    ["pledge_document_name", "VARCHAR(255) NULL AFTER pledge_document_path"],
    ["pledge_payment_method", "VARCHAR(40) NULL AFTER pledge_document_name"],
    ["pledge_payment_details", "TEXT NULL AFTER pledge_payment_method"],
    ["pledge_status", "ENUM('not_applicable','awaiting_release','released','cancelled') NOT NULL DEFAULT 'not_applicable' AFTER pledge_document_name"],
    ["pledge_resolved_at", "DATETIME NULL AFTER pledge_status"],
    ["bill_id", "BIGINT UNSIGNED NULL AFTER pledge_resolved_at"],
  ];
  for (const [name, definition] of transactionColumns) {
    if (!transactionColumnNames.has(name)) await connection.query(`ALTER TABLE branch_transactions ADD COLUMN ${name} ${definition}`);
  }
  await connection.query("ALTER TABLE branch_transactions MODIFY COLUMN status ENUM('awaiting_pledge','submitted','transit','billed','rejected') NOT NULL DEFAULT 'submitted'");
  const businessActorColumns = [
    ["customers", "origin_branch_id", "VARCHAR(100) NULL AFTER customer_image_path"],
    ["customers", "created_by_employee_id", "VARCHAR(100) NULL AFTER origin_branch_id"],
    ["kyc_records", "created_by_employee_id", "VARCHAR(100) NULL AFTER verified"],
    ["bills", "origin_branch_id", "VARCHAR(100) NULL AFTER notes"],
    ["bills", "created_by_employee_id", "VARCHAR(100) NULL AFTER origin_branch_id"],
  ];
  for (const [table, name, definition] of businessActorColumns) {
    const [columns] = await connection.query(`SHOW COLUMNS FROM ${table}`);
    if (!columns.some((column) => column.Field === name)) await connection.query(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
  }
  await connection.query("ALTER TABLE customers MODIFY COLUMN created_by INT UNSIGNED NULL");
  await connection.query("ALTER TABLE kyc_records MODIFY COLUMN created_by INT UNSIGNED NULL");
  await connection.query("ALTER TABLE bills MODIFY COLUMN created_by INT UNSIGNED NULL");
  const [transactionIndexes] = await connection.query("SHOW INDEX FROM branch_transactions WHERE Key_name='uq_branch_transaction_bill'");
  if (!transactionIndexes.length) await connection.query("ALTER TABLE branch_transactions ADD UNIQUE KEY uq_branch_transaction_bill (bill_id)");
  const [billForeignKeys] = await connection.query("SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=? AND TABLE_NAME='branch_transactions' AND CONSTRAINT_NAME='fk_branch_transaction_bill'", [process.env.DB_NAME]);
  if (!billForeignKeys.length) await connection.query("ALTER TABLE branch_transactions ADD CONSTRAINT fk_branch_transaction_bill FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE SET NULL");

  const [existingTransferColumns] = await connection.query("SHOW COLUMNS FROM branch_gold_transfers");
  if (!existingTransferColumns.some((column) => column.Field === "tare_weight_mg")) {
    await connection.query("ALTER TABLE branch_gold_transfers ADD COLUMN tare_weight_mg BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER weight_mg");
  }
  if (!existingTransferColumns.some((column) => column.Field === "bm_name")) {
    await connection.query("ALTER TABLE branch_gold_transfers ADD COLUMN bm_name VARCHAR(190) NULL AFTER tare_weight_mg");
  }
  if (!existingTransferColumns.some((column) => column.Field === "bm_phone")) {
    await connection.query("ALTER TABLE branch_gold_transfers ADD COLUMN bm_phone VARCHAR(20) NULL AFTER bm_name");
  }

  const companies = [
    ["aryan-gold", "Aryan Gold", "AG", "/brands/aryan-gold.png", "AG"],
    ["aryan-jewels", "Aryan Jewels", "AJ", "/brands/aryan-jewels.png", "AJ"],
    ["lakshmi-bullion", "Lakshmi Bullion", "LB", "/brands/lakshmi-bullion-gold.png", "LB"],
  ];
  for (const company of companies) {
    await connection.execute(`INSERT INTO companies (slug, name, short_name, logo_path, invoice_prefix)
      VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), short_name=VALUES(short_name), logo_path=VALUES(logo_path), invoice_prefix=VALUES(invoice_prefix)`, company);
  }

  const email = process.env.INITIAL_ADMIN_EMAIL.toLowerCase();
  const [existing] = await connection.execute("SELECT id FROM admins WHERE email = ? LIMIT 1", [email]);
  let adminId;
  if (existing.length) {
    adminId = existing[0].id;
  } else {
    const [created] = await connection.execute("INSERT INTO admins (email, name, password_hash) VALUES (?, ?, ?)",
      [email, "Aryan Gold Administrator", hashPassword(process.env.INITIAL_ADMIN_PASSWORD)]);
    adminId = created.insertId;
  }
  await connection.execute("INSERT IGNORE INTO admin_company_access (admin_id, company_id) SELECT ?, id FROM companies", [adminId]);
  const floorActorEmail = "floor-user@internal.aryangold";
  await connection.execute(`INSERT INTO admins (email,name,password_hash,active) VALUES (?,?,?,0)
    ON DUPLICATE KEY UPDATE name=VALUES(name),active=0`,
    [floorActorEmail, "Floor Operations User", hashPassword(randomBytes(32).toString("hex"))]);
  const [floorActorRows] = await connection.execute("SELECT id FROM admins WHERE email=? LIMIT 1", [floorActorEmail]);
  const floorActorId = floorActorRows[0].id;
  const headOfficeUsers = [
    {
      username: process.env.HEAD_OFFICE_AUDITOR_USERNAME || "auditor",
      name: "Head Office Auditor",
      role: "auditor",
      password: process.env.HEAD_OFFICE_AUDITOR_PASSWORD || process.env.INITIAL_ADMIN_PASSWORD,
      operationsAdminId: null,
    },
    {
      username: process.env.HEAD_OFFICE_MELTER_USERNAME || "melter",
      name: "Head Office Melter",
      role: "melter",
      password: process.env.HEAD_OFFICE_MELTER_PASSWORD || process.env.INITIAL_ADMIN_PASSWORD,
      operationsAdminId: null,
    },
    {
      username: process.env.HEAD_OFFICE_FLOOR_USERNAME || "floor",
      name: "Floor Operations User",
      role: "floor",
      password: process.env.HEAD_OFFICE_FLOOR_PASSWORD || process.env.INITIAL_ADMIN_PASSWORD,
      operationsAdminId: floorActorId,
    },
  ];
  for (const user of headOfficeUsers) {
    await connection.execute(`INSERT INTO head_office_users (username,name,role,operations_admin_id,password_hash,active) VALUES (?,?,?,?,?,1)
      ON DUPLICATE KEY UPDATE name=VALUES(name),role=VALUES(role),operations_admin_id=VALUES(operations_admin_id),active=1`,
      [user.username.toLowerCase(), user.name, user.role, user.operationsAdminId, hashPassword(user.password)]);
  }
  const accountsUsername = (process.env.ACCOUNTS_USERNAME || "accounts").toLowerCase();
  const accountsPassword = process.env.ACCOUNTS_PASSWORD || process.env.INITIAL_ADMIN_PASSWORD;
  await connection.execute(`INSERT INTO accounts_users (username,name,password_hash,active) VALUES (?,?,?,1)
    ON DUPLICATE KEY UPDATE name=VALUES(name),active=1`,
    [accountsUsername, "Accounts Executive", hashPassword(accountsPassword)]);
  await connection.query(`INSERT INTO chat_users (actor_type,actor_key,username,display_name,role_label,active,last_seen_at)
    SELECT 'admin',CONCAT('admin:',id),email,name,'Administrator',active,UTC_TIMESTAMP() FROM admins
    ON DUPLICATE KEY UPDATE username=VALUES(username),display_name=VALUES(display_name),role_label=VALUES(role_label),active=VALUES(active)`);
  await connection.query(`INSERT INTO chat_users (actor_type,actor_key,username,display_name,role_label,active,last_seen_at)
    SELECT 'head_office',CONCAT('head-office:',id),username,name,
      CASE role WHEN 'auditor' THEN 'Head Office Auditor' WHEN 'melter' THEN 'Head Office Melter' ELSE 'Floor Operations' END,
      active,UTC_TIMESTAMP() FROM head_office_users
    ON DUPLICATE KEY UPDATE username=VALUES(username),display_name=VALUES(display_name),role_label=VALUES(role_label),active=VALUES(active)`);
  await connection.query(`INSERT INTO chat_users (actor_type,actor_key,username,display_name,role_label,active,last_seen_at)
    SELECT 'accounts',CONCAT('accounts:',id),username,name,'Accounts',active,UTC_TIMESTAMP() FROM accounts_users
    ON DUPLICATE KEY UPDATE username=VALUES(username),display_name=VALUES(display_name),role_label=VALUES(role_label),active=VALUES(active)`);
  await connection.query(`INSERT INTO chat_users (actor_type,actor_key,username,display_name,role_label,active,last_seen_at)
    SELECT 'branch',CONCAT('branch:',branch_id,':',employee_id),employee_id,employee_name,CONCAT(branch_name,' Branch'),1,MAX(created_at)
    FROM branch_sessions GROUP BY branch_id,employee_id,employee_name,branch_name
    ON DUPLICATE KEY UPDATE username=VALUES(username),display_name=VALUES(display_name),role_label=VALUES(role_label),active=1,last_seen_at=GREATEST(last_seen_at,VALUES(last_seen_at))`);
  await connection.execute("DELETE FROM sessions WHERE expires_at < UTC_TIMESTAMP()");
  await connection.execute("DELETE FROM head_office_sessions WHERE expires_at < UTC_TIMESTAMP()");
  await connection.execute("DELETE FROM accounts_sessions WHERE expires_at < UTC_TIMESTAMP()");
  mkdirSync(path.join(process.cwd(), "storage", "kyc"), { recursive: true });
  mkdirSync(path.join(process.cwd(), "storage", "ornaments"), { recursive: true });
  mkdirSync(path.join(process.cwd(), "storage", "signatures"), { recursive: true });
  mkdirSync(path.join(process.cwd(), "storage", "pledges"), { recursive: true });
  mkdirSync(path.join(process.cwd(), "storage", "chat"), { recursive: true });
  console.log("Database tables, companies, administrator, branch operations, Head Office users, and Accounts user are ready.");
} finally {
  await connection.end();
}
