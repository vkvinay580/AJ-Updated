CREATE TABLE IF NOT EXISTS companies (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(60) NOT NULL,
  name VARCHAR(120) NOT NULL,
  short_name VARCHAR(10) NOT NULL,
  logo_path VARCHAR(255) NOT NULL,
  invoice_prefix VARCHAR(12) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_companies_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admins (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(190) NOT NULL,
  name VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_admins_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_company_access (
  admin_id INT UNSIGNED NOT NULL,
  company_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (admin_id, company_id),
  CONSTRAINT fk_access_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
  CONSTRAINT fk_access_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  token_hash CHAR(64) NOT NULL,
  admin_id INT UNSIGNED NOT NULL,
  company_id INT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_sessions_token (token_hash), KEY idx_sessions_expiry (expires_at),
  CONSTRAINT fk_sessions_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
  CONSTRAINT fk_sessions_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id INT UNSIGNED NOT NULL,
  phone CHAR(10) NOT NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NULL,
  address VARCHAR(500) NULL,
  city VARCHAR(100) NULL,
  state VARCHAR(100) NULL,
  gstin VARCHAR(15) NULL,
  state_code CHAR(2) NULL,
  place_of_supply VARCHAR(100) NULL,
  postal_code VARCHAR(10) NULL,
  customer_image_path VARCHAR(255) NULL,
  employer_name VARCHAR(190) NULL,
  employer_address VARCHAR(500) NULL,
  employment_designation VARCHAR(120) NULL,
  company_id_card_path VARCHAR(255) NULL,
  company_id_card_original_name VARCHAR(255) NULL,
  company_id_card_mime_type VARCHAR(100) NULL,
  old_gold_wearing_image_path VARCHAR(255) NULL,
  old_gold_wearing_image_original_name VARCHAR(255) NULL,
  old_gold_wearing_image_mime_type VARCHAR(100) NULL,
  recommendation_name VARCHAR(190) NULL,
  recommendation_relationship VARCHAR(120) NULL,
  recommendation_phone VARCHAR(20) NULL,
  recommendation_address VARCHAR(500) NULL,
  origin_branch_id VARCHAR(100) NULL,
  created_by_employee_id VARCHAR(100) NULL,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_customer_company_phone (company_id, phone), KEY idx_customer_company_name (company_id, name),
  CONSTRAINT fk_customer_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_customer_admin FOREIGN KEY (created_by) REFERENCES admins(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kyc_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id BIGINT UNSIGNED NOT NULL,
  company_id INT UNSIGNED NOT NULL,
  document_type ENUM('aadhaar','pan') NOT NULL,
  number_encrypted TEXT NOT NULL,
  number_hash CHAR(64) NOT NULL,
  number_last4 CHAR(4) NOT NULL,
  document_path VARCHAR(255) NULL,
  original_name VARCHAR(255) NULL,
  mime_type VARCHAR(100) NULL,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  created_by_employee_id VARCHAR(100) NULL,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_kyc_company_type_hash (company_id, document_type, number_hash), KEY idx_kyc_company_customer (company_id, customer_id),
  CONSTRAINT fk_kyc_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_kyc_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_kyc_admin FOREIGN KEY (created_by) REFERENCES admins(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS te_users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id VARCHAR(100) NOT NULL,
  name VARCHAR(190) NOT NULL,
  phone VARCHAR(20) NULL,
  password_hash VARCHAR(255) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_te_users_user_id (user_id),
  CONSTRAINT fk_te_user_admin FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS te_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  token_hash CHAR(64) NOT NULL,
  te_user_id INT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_te_sessions_token (token_hash),
  KEY idx_te_sessions_expiry (expires_at),
  CONSTRAINT fk_te_session_user FOREIGN KEY (te_user_id) REFERENCES te_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS te_device_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  te_user_id INT UNSIGNED NOT NULL,
  device_token VARCHAR(512) NOT NULL,
  platform VARCHAR(30) NOT NULL DEFAULT 'android',
  last_seen_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_te_device_token (device_token(190)),
  KEY idx_te_device_user (te_user_id, last_seen_at),
  CONSTRAINT fk_te_device_user FOREIGN KEY (te_user_id) REFERENCES te_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_verification_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id INT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  te_user_id INT UNSIGNED NOT NULL,
  branch_id VARCHAR(100) NOT NULL,
  branch_name VARCHAR(190) NOT NULL,
  bm_employee_id VARCHAR(100) NOT NULL,
  bm_name VARCHAR(190) NOT NULL,
  bm_phone VARCHAR(20) NOT NULL,
  request_notes VARCHAR(1000) NULL,
  status ENUM('assigned','in_progress','verified','could_not_verify') NOT NULL DEFAULT 'assigned',
  authentication_person_name VARCHAR(190) NULL,
  authentication_person_relationship VARCHAR(120) NULL,
  authentication_person_phone VARCHAR(20) NULL,
  verification_notes VARCHAR(2000) NULL,
  failure_reason VARCHAR(1000) NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_verification_te_status (te_user_id, status, assigned_at),
  KEY idx_verification_customer (company_id, customer_id, assigned_at),
  KEY idx_verification_branch (branch_id, bm_employee_id, assigned_at),
  CONSTRAINT fk_verification_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_verification_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_verification_te FOREIGN KEY (te_user_id) REFERENCES te_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_verification_photos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id BIGINT UNSIGNED NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  captured_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_verification_photos_request (request_id, id),
  CONSTRAINT fk_verification_photo_request FOREIGN KEY (request_id) REFERENCES customer_verification_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_verification_videos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id BIGINT UNSIGNED NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL DEFAULT 'video/mp4',
  duration_ms INT UNSIGNED NOT NULL,
  byte_size INT UNSIGNED NOT NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  captured_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_verification_video_request (request_id),
  CONSTRAINT fk_verification_video_request FOREIGN KEY (request_id) REFERENCES customer_verification_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_verification_references (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(190) NOT NULL,
  relationship VARCHAR(120) NULL,
  phone VARCHAR(20) NOT NULL,
  notes VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_verification_references_request (request_id, id),
  CONSTRAINT fk_verification_reference_request FOREIGN KEY (request_id) REFERENCES customer_verification_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS verification_result_views (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id BIGINT UNSIGNED NOT NULL,
  viewer_role ENUM('admin','floor','branch') NOT NULL,
  viewer_key VARCHAR(120) NOT NULL,
  viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_verification_viewer (request_id, viewer_role, viewer_key),
  KEY idx_verification_views_request (request_id, viewed_at),
  CONSTRAINT fk_verification_view_request FOREIGN KEY (request_id) REFERENCES customer_verification_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS branch_notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  branch_id VARCHAR(100) NOT NULL,
  employee_id VARCHAR(100) NOT NULL,
  verification_request_id BIGINT UNSIGNED NULL,
  title VARCHAR(190) NOT NULL,
  body VARCHAR(1000) NOT NULL,
  read_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_branch_notifications_user (branch_id, employee_id, read_at, created_at),
  CONSTRAINT fk_branch_notification_verification FOREIGN KEY (verification_request_id) REFERENCES customer_verification_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bills (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id INT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  bill_number VARCHAR(40) NOT NULL,
  transaction_type ENUM('sale','purchase') NOT NULL,
  bill_date DATE NOT NULL,
  subtotal_paise BIGINT NOT NULL,
  tax_paise BIGINT NOT NULL DEFAULT 0,
  cgst_paise BIGINT NOT NULL DEFAULT 0,
  sgst_paise BIGINT NOT NULL DEFAULT 0,
  cgst_rate_bps INT UNSIGNED NOT NULL DEFAULT 0,
  sgst_rate_bps INT UNSIGNED NOT NULL DEFAULT 0,
  adjustment_paise BIGINT NOT NULL DEFAULT 0,
  total_paise BIGINT NOT NULL,
  payment_method VARCHAR(40) NOT NULL,
  account_number TEXT NULL,
  ifsc_code VARCHAR(11) NULL,
  upi_id VARCHAR(100) NULL,
  cheque_number VARCHAR(20) NULL,
  card_number TEXT NULL,
  ornament_image_path VARCHAR(255) NULL,
  signature_image_path VARCHAR(255) NULL,
  notes VARCHAR(1000) NULL,
  release_place VARCHAR(190) NULL,
  release_amount_paise BIGINT UNSIGNED NULL,
  origin_branch_id VARCHAR(100) NULL,
  created_by_employee_id VARCHAR(100) NULL,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_bill_company_number (company_id, bill_number), KEY idx_bill_company_date (company_id, bill_date),
  CONSTRAINT fk_bill_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_bill_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_bill_admin FOREIGN KEY (created_by) REFERENCES admins(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoice_sequences (
  company_id INT UNSIGNED NOT NULL,
  invoice_year SMALLINT UNSIGNED NOT NULL,
  last_number INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (company_id, invoice_year),
  CONSTRAINT fk_sequence_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bill_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  bill_id BIGINT UNSIGNED NOT NULL,
  description VARCHAR(190) NOT NULL,
  item_description VARCHAR(190) NULL,
  hsn_code VARCHAR(30) NULL,
  purity VARCHAR(30) NULL,
  metal ENUM('gold','silver') NOT NULL DEFAULT 'gold',
  gross_weight_mg BIGINT NOT NULL DEFAULT 0,
  stone_weight_mg BIGINT NOT NULL DEFAULT 0,
  weight_mg BIGINT NOT NULL,
  rate_paise_per_gram BIGINT NOT NULL,
  making_paise BIGINT NOT NULL DEFAULT 0,
  amount_paise BIGINT NOT NULL,
  PRIMARY KEY (id), KEY idx_bill_items_bill (bill_id),
  CONSTRAINT fk_item_bill FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS accounts_users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL,
  name VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_accounts_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS accounts_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  token_hash CHAR(64) NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_accounts_session_token (token_hash), KEY idx_accounts_sessions_expiry (expires_at),
  CONSTRAINT fk_accounts_session_user FOREIGN KEY (user_id) REFERENCES accounts_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_type ENUM('admin','branch','head_office','accounts') NOT NULL,
  actor_key VARCHAR(190) NOT NULL,
  username VARCHAR(190) NOT NULL,
  display_name VARCHAR(190) NOT NULL,
  role_label VARCHAR(190) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  last_seen_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_chat_user_actor (actor_type, actor_key),
  KEY idx_chat_users_active_name (active, display_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sender_user_id BIGINT UNSIGNED NOT NULL,
  recipient_user_id BIGINT UNSIGNED NOT NULL,
  body TEXT NULL,
  attachment_path VARCHAR(500) NULL,
  attachment_name VARCHAR(255) NULL,
  attachment_mime VARCHAR(150) NULL,
  attachment_size BIGINT UNSIGNED NULL,
  read_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_chat_sender_recipient_date (sender_user_id, recipient_user_id, created_at),
  KEY idx_chat_recipient_unread (recipient_user_id, read_at, created_at),
  CONSTRAINT fk_chat_message_sender FOREIGN KEY (sender_user_id) REFERENCES chat_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_chat_message_recipient FOREIGN KEY (recipient_user_id) REFERENCES chat_users(id) ON DELETE CASCADE,
  CONSTRAINT chk_chat_message_content CHECK (body IS NOT NULL OR attachment_path IS NOT NULL),
  CONSTRAINT chk_chat_message_recipient CHECK (sender_user_id <> recipient_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bill_payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  bill_id BIGINT UNSIGNED NOT NULL,
  payment_method VARCHAR(40) NOT NULL,
  amount_paise BIGINT UNSIGNED NOT NULL,
  reference_text VARCHAR(190) NULL,
  account_number TEXT NULL,
  ifsc_code VARCHAR(11) NULL,
  upi_id VARCHAR(100) NULL,
  payment_status ENUM('not_required','pending','paid') NOT NULL DEFAULT 'not_required',
  utr_number VARCHAR(100) NULL,
  paid_by_account_user_id INT UNSIGNED NULL,
  paid_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_bill_payments_bill (bill_id), KEY idx_bill_payments_method (payment_method),
  KEY idx_bill_payments_status (payment_status, payment_method),
  CONSTRAINT fk_bill_payment_bill FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
  CONSTRAINT fk_bill_payment_accounts_user FOREIGN KEY (paid_by_account_user_id) REFERENCES accounts_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id INT UNSIGNED NOT NULL,
  metal ENUM('gold','silver') NOT NULL,
  movement ENUM('add','remove') NOT NULL,
  weight_mg BIGINT UNSIGNED NOT NULL,
  notes VARCHAR(500) NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_stock_company_date (company_id, created_at),
  CONSTRAINT fk_stock_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_stock_admin FOREIGN KEY (created_by) REFERENCES admins(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_id INT UNSIGNED NULL,
  company_id INT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(60) NULL,
  entity_id BIGINT UNSIGNED NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_audit_company_date (company_id, created_at),
  CONSTRAINT fk_audit_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL,
  CONSTRAINT fk_audit_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS business_settings (
  id TINYINT UNSIGNED NOT NULL DEFAULT 1,
  sale_rate_paise_per_gram BIGINT UNSIGNED NOT NULL DEFAULT 0,
  purchase_rate_paise_per_gram BIGINT UNSIGNED NOT NULL DEFAULT 0,
  sale_rate_999_paise_per_gram BIGINT UNSIGNED NOT NULL DEFAULT 0,
  purchase_rate_999_paise_per_gram BIGINT UNSIGNED NOT NULL DEFAULT 0,
  sale_rate_916_paise_per_gram BIGINT UNSIGNED NOT NULL DEFAULT 0,
  purchase_rate_916_paise_per_gram BIGINT UNSIGNED NOT NULL DEFAULT 0,
  sale_rate_750_paise_per_gram BIGINT UNSIGNED NOT NULL DEFAULT 0,
  purchase_rate_750_paise_per_gram BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_by INT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_business_settings_admin FOREIGN KEY (updated_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Keep this seed compatible with existing installations whose purity columns are
-- added by scripts/setup-db.mjs immediately after the base schema is applied.
INSERT IGNORE INTO business_settings (id, sale_rate_paise_per_gram, purchase_rate_paise_per_gram)
VALUES (1, 1520000, 1480000);

CREATE TABLE IF NOT EXISTS branch_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  token_hash CHAR(64) NOT NULL,
  branch_id VARCHAR(100) NOT NULL,
  branch_name VARCHAR(190) NOT NULL,
  employee_id VARCHAR(100) NOT NULL,
  employee_name VARCHAR(190) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_branch_sessions_token (token_hash),
  KEY idx_branch_sessions_expiry (expires_at), KEY idx_branch_sessions_branch (branch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS branch_customers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  branch_id VARCHAR(100) NOT NULL,
  name VARCHAR(190) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address VARCHAR(500) NULL,
  created_by_employee_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_branch_customer_phone (branch_id, phone),
  KEY idx_branch_customers_branch (branch_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS branch_transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  branch_id VARCHAR(100) NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  transaction_type ENUM('purchase','sale') NOT NULL DEFAULT 'purchase',
  business_mode ENUM('walkin','pledged') NOT NULL DEFAULT 'walkin',
  gold_weight_mg BIGINT UNSIGNED NOT NULL,
  rate_paise_per_gram BIGINT UNSIGNED NOT NULL,
  amount_paise BIGINT UNSIGNED NOT NULL,
  pledge_amount_paise BIGINT UNSIGNED NULL,
  release_place VARCHAR(190) NULL,
  release_amount_paise BIGINT UNSIGNED NULL,
  pledge_document_path VARCHAR(255) NULL,
  pledge_document_name VARCHAR(255) NULL,
  pledge_payment_method VARCHAR(40) NULL,
  pledge_payment_details TEXT NULL,
  pledge_status ENUM('not_applicable','awaiting_release','released','cancelled') NOT NULL DEFAULT 'not_applicable',
  pledge_resolved_at DATETIME NULL,
  bill_id BIGINT UNSIGNED NULL,
  notes VARCHAR(1000) NULL,
  status ENUM('awaiting_pledge','submitted','transit','billed','rejected') NOT NULL DEFAULT 'submitted',
  created_by_employee_id VARCHAR(100) NOT NULL,
  reviewed_by INT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_branch_transaction_bill (bill_id), KEY idx_branch_transactions_review (status, created_at),
  KEY idx_branch_transactions_branch (branch_id, created_at),
  CONSTRAINT fk_branch_transaction_customer FOREIGN KEY (customer_id) REFERENCES branch_customers(id),
  CONSTRAINT fk_branch_transaction_bill FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE SET NULL,
  CONSTRAINT fk_branch_transaction_admin FOREIGN KEY (reviewed_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS branch_pledge_documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  transaction_id BIGINT UNSIGNED NOT NULL,
  document_path VARCHAR(255) NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_pledge_documents_transaction (transaction_id),
  CONSTRAINT fk_pledge_document_transaction FOREIGN KEY (transaction_id) REFERENCES branch_transactions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS branch_fund_ledger (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  branch_id VARCHAR(100) NOT NULL,
  direction ENUM('credit','debit') NOT NULL,
  amount_paise BIGINT UNSIGNED NOT NULL,
  entry_type VARCHAR(60) NOT NULL,
  reference_id BIGINT UNSIGNED NOT NULL,
  description VARCHAR(500) NOT NULL,
  created_by_employee_id VARCHAR(100) NULL,
  created_by_admin_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_branch_fund_entry (entry_type, reference_id, direction),
  KEY idx_branch_fund_ledger (branch_id, created_at),
  CONSTRAINT fk_branch_fund_ledger_admin FOREIGN KEY (created_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS branch_stock_ledger (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  branch_id VARCHAR(100) NOT NULL,
  direction ENUM('in','out') NOT NULL,
  weight_mg BIGINT UNSIGNED NOT NULL,
  entry_type VARCHAR(60) NOT NULL,
  reference_id BIGINT UNSIGNED NOT NULL,
  description VARCHAR(500) NOT NULL,
  created_by_employee_id VARCHAR(100) NULL,
  created_by_admin_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_branch_stock_entry (entry_type, reference_id, direction),
  KEY idx_branch_stock_ledger (branch_id, created_at),
  CONSTRAINT fk_branch_stock_ledger_admin FOREIGN KEY (created_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS branch_gold_transfers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  branch_id VARCHAR(100) NOT NULL,
  weight_mg BIGINT UNSIGNED NOT NULL,
  tare_weight_mg BIGINT UNSIGNED NOT NULL DEFAULT 0,
  bm_name VARCHAR(190) NULL,
  bm_phone VARCHAR(20) NULL,
  notes VARCHAR(500) NULL,
  status ENUM('submitted','received','rejected') NOT NULL DEFAULT 'submitted',
  created_by_employee_id VARCHAR(100) NOT NULL,
  reviewed_by INT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  admin_notes VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_branch_gold_transfer_review (status, created_at),
  KEY idx_branch_gold_transfer_branch (branch_id, created_at),
  CONSTRAINT fk_branch_gold_transfer_admin FOREIGN KEY (reviewed_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS branch_gold_transfer_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  transfer_id BIGINT UNSIGNED NOT NULL,
  transaction_id BIGINT UNSIGNED NOT NULL,
  bill_id BIGINT UNSIGNED NOT NULL,
  bill_item_id BIGINT UNSIGNED NOT NULL,
  sent_weight_mg BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_gold_transfer_bill_item (bill_item_id),
  KEY idx_gold_transfer_items_transfer (transfer_id), KEY idx_gold_transfer_items_transaction (transaction_id),
  CONSTRAINT fk_gold_transfer_item_transfer FOREIGN KEY (transfer_id) REFERENCES branch_gold_transfers(id) ON DELETE CASCADE,
  CONSTRAINT fk_gold_transfer_item_transaction FOREIGN KEY (transaction_id) REFERENCES branch_transactions(id),
  CONSTRAINT fk_gold_transfer_item_bill FOREIGN KEY (bill_id) REFERENCES bills(id),
  CONSTRAINT fk_gold_transfer_item_bill_item FOREIGN KEY (bill_item_id) REFERENCES bill_items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS head_office_users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL,
  name VARCHAR(190) NOT NULL,
  role ENUM('auditor','melter','floor') NOT NULL,
  operations_admin_id INT UNSIGNED NULL,
  password_hash VARCHAR(255) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_head_office_username (username),
  CONSTRAINT fk_head_office_operations_admin FOREIGN KEY (operations_admin_id) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS head_office_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  token_hash CHAR(64) NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_head_office_session_token (token_hash),
  KEY idx_head_office_sessions_expiry (expires_at),
  CONSTRAINT fk_head_office_session_user FOREIGN KEY (user_id) REFERENCES head_office_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS head_office_ornament_audits (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  transfer_item_id BIGINT UNSIGNED NOT NULL,
  status ENUM('audited','grouped') NOT NULL DEFAULT 'audited',
  audited_weight_mg BIGINT UNSIGNED NOT NULL,
  received_by INT UNSIGNED NOT NULL,
  audited_by INT UNSIGNED NOT NULL,
  received_at DATETIME NOT NULL,
  audited_at DATETIME NOT NULL,
  notes VARCHAR(500) NULL,
  PRIMARY KEY (id), UNIQUE KEY uq_ornament_audit_transfer_item (transfer_item_id),
  KEY idx_ornament_audits_status (status, audited_at),
  CONSTRAINT fk_ornament_audit_item FOREIGN KEY (transfer_item_id) REFERENCES branch_gold_transfer_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_ornament_audit_received_user FOREIGN KEY (received_by) REFERENCES head_office_users(id),
  CONSTRAINT fk_ornament_audit_audited_user FOREIGN KEY (audited_by) REFERENCES head_office_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS melt_daily_sequences (
  melt_date DATE NOT NULL,
  last_number INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (melt_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS melt_groups (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  gatti_id VARCHAR(40) NOT NULL,
  melt_date DATE NOT NULL,
  status ENUM('created','completed') NOT NULL DEFAULT 'created',
  audited_total_weight_mg BIGINT UNSIGNED NOT NULL,
  input_weight_mg BIGINT UNSIGNED NULL,
  output_gatti_weight_mg BIGINT UNSIGNED NULL,
  matti_weight_mg BIGINT UNSIGNED NULL,
  purity DECIMAL(6,3) NULL,
  notes VARCHAR(1000) NULL,
  melter_notes VARCHAR(1000) NULL,
  created_by INT UNSIGNED NOT NULL,
  completed_by INT UNSIGNED NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_melt_group_gatti_id (gatti_id),
  KEY idx_melt_groups_date_status (melt_date, status),
  CONSTRAINT fk_melt_group_creator FOREIGN KEY (created_by) REFERENCES head_office_users(id),
  CONSTRAINT fk_melt_group_completer FOREIGN KEY (completed_by) REFERENCES head_office_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS melt_group_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  melt_group_id BIGINT UNSIGNED NOT NULL,
  transfer_item_id BIGINT UNSIGNED NOT NULL,
  audited_weight_mg BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_melt_group_transfer_item (transfer_item_id),
  KEY idx_melt_group_items_group (melt_group_id),
  CONSTRAINT fk_melt_group_item_group FOREIGN KEY (melt_group_id) REFERENCES melt_groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_melt_group_item_transfer FOREIGN KEY (transfer_item_id) REFERENCES branch_gold_transfer_items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gatti_sales (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  melt_group_id BIGINT UNSIGNED NOT NULL,
  sale_date DATE NOT NULL,
  sale_rate_paise_per_gram BIGINT UNSIGNED NOT NULL,
  sold_to VARCHAR(190) NOT NULL,
  sale_amount_paise BIGINT UNSIGNED NOT NULL,
  notes VARCHAR(500) NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_gatti_sales_melt_group (melt_group_id),
  KEY idx_gatti_sales_date (sale_date),
  CONSTRAINT fk_gatti_sale_melt_group FOREIGN KEY (melt_group_id) REFERENCES melt_groups(id),
  CONSTRAINT fk_gatti_sale_admin FOREIGN KEY (created_by) REFERENCES admins(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fund_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  branch_id VARCHAR(100) NOT NULL,
  requested_amount_paise BIGINT UNSIGNED NOT NULL,
  approved_amount_paise BIGINT UNSIGNED NULL,
  purpose VARCHAR(500) NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_by_employee_id VARCHAR(100) NOT NULL,
  reviewed_by INT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  admin_notes VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_fund_requests_review (status, created_at),
  KEY idx_fund_requests_branch (branch_id, created_at),
  CONSTRAINT fk_fund_request_admin FOREIGN KEY (reviewed_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS branch_expenses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  branch_id VARCHAR(100) NOT NULL,
  expense_date DATE NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount_paise BIGINT UNSIGNED NOT NULL,
  description VARCHAR(500) NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_by_employee_id VARCHAR(100) NOT NULL,
  reviewed_by INT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  admin_notes VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_branch_expenses_review (status, created_at),
  KEY idx_branch_expenses_branch (branch_id, expense_date),
  CONSTRAINT fk_branch_expense_admin FOREIGN KEY (reviewed_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS branch_daily_closings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  branch_id VARCHAR(100) NOT NULL,
  closing_date DATE NOT NULL,
  opening_cash_paise BIGINT UNSIGNED NOT NULL,
  transaction_count INT UNSIGNED NOT NULL,
  expenses_paise BIGINT UNSIGNED NOT NULL,
  gold_purchased_mg BIGINT UNSIGNED NOT NULL,
  amount_paid_paise BIGINT UNSIGNED NOT NULL,
  gold_sent_to_ho_mg BIGINT UNSIGNED NOT NULL,
  gold_in_branch_stock_mg BIGINT UNSIGNED NOT NULL,
  notes VARCHAR(1000) NULL,
  created_by_employee_id VARCHAR(100) NOT NULL,
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_branch_closing_date (branch_id, closing_date),
  KEY idx_branch_closings_date (closing_date, branch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
