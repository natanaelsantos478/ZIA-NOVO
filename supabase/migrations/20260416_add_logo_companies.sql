ALTER TABLE zia_companies
  ADD COLUMN IF NOT EXISTS logo_url          TEXT,
  ADD COLUMN IF NOT EXISTS logo_storage_path TEXT;
