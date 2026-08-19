ALTER TABLE test_executions DROP CONSTRAINT IF EXISTS test_executions_origin_check;
ALTER TABLE test_executions
  ADD CONSTRAINT test_executions_origin_check
  CHECK (origin IN ('SEEDED_DEMO', 'DEMO_PIPELINE', 'EXTERNAL_CI'));

ALTER TABLE demo_runs
  ADD COLUMN runner_mode TEXT NOT NULL DEFAULT 'local',
  ADD COLUMN preview_status TEXT;

ALTER TABLE demo_runs
  ADD CONSTRAINT demo_runs_runner_mode_check
  CHECK (runner_mode IN ('local', 'hosted-preview')),
  ADD CONSTRAINT demo_runs_preview_status_check
  CHECK (preview_status IS NULL OR preview_status = 'EXTERNAL_CI_INTEGRATION_PENDING');
