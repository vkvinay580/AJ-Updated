ALTER TABLE bills
  ADD COLUMN origin_state_code CHAR(2) NOT NULL DEFAULT 'KA' AFTER origin_branch_id;

ALTER TABLE invoice_sequences
  ADD COLUMN state_code CHAR(2) NOT NULL DEFAULT 'KA' AFTER company_id,
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (company_id, state_code, invoice_year);

-- Backfill existing Tamil Nadu bills with their branch IDs before generating
-- state-filtered historical reports.
