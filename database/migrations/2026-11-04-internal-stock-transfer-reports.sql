ALTER TABLE branch_gold_transfers
  ADD COLUMN gross_weight_mg BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER weight_mg,
  ADD COLUMN transfer_value_paise BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER gross_weight_mg,
  ADD COLUMN itr_number VARCHAR(100) NULL AFTER bm_phone,
  ADD COLUMN itr_date DATE NULL AFTER itr_number,
  ADD COLUMN origin_state VARCHAR(100) NULL AFTER itr_date,
  ADD COLUMN origin_state_code CHAR(2) NULL AFTER origin_state,
  ADD COLUMN place_of_supply VARCHAR(100) NULL AFTER origin_state_code,
  ADD COLUMN transporter_name VARCHAR(190) NULL AFTER place_of_supply,
  ADD COLUMN transporter_gstin VARCHAR(20) NULL AFTER transporter_name,
  ADD COLUMN transportation_mode VARCHAR(20) NULL AFTER transporter_gstin,
  ADD COLUMN shipper_details TEXT NULL AFTER transportation_mode,
  ADD COLUMN consignee_details TEXT NULL AFTER shipper_details,
  ADD COLUMN purpose_of_movement VARCHAR(190) NULL AFTER consignee_details,
  ADD COLUMN shipping_address TEXT NULL AFTER purpose_of_movement,
  ADD UNIQUE KEY uq_branch_gold_transfer_itr (itr_number);

CREATE TABLE IF NOT EXISTS internal_stock_transfer_sequences (
  branch_id VARCHAR(100) NOT NULL,
  transfer_date DATE NOT NULL,
  last_number INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (branch_id, transfer_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
