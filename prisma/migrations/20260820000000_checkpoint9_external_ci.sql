DROP INDEX IF EXISTS integration_tokens_one_active_per_product_idx;
CREATE UNIQUE INDEX integration_tokens_one_active_per_product_idx
  ON integration_tokens(product_id)
  WHERE revoked_at IS NULL;

ALTER TABLE demo_runs DROP CONSTRAINT IF EXISTS demo_runs_preview_status_check;
ALTER TABLE demo_runs
  ADD CONSTRAINT demo_runs_preview_status_check
  CHECK (preview_status IS NULL OR preview_status IN (
    'EXTERNAL_CI_INTEGRATION_PENDING',
    'EXTERNAL_CI_ACTIVE'
  ));
