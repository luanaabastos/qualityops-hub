import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import {
  calculateApprovalRate,
  calculateFreshness,
  calculateQualityScore,
  calculateRegressionDelta,
  demoAutomationCoverageSummary,
  fictionalProducts,
  type NormalizedExecution,
  type ProductKey
} from '@qualityops-hub/shared';
import type { Database } from './database.js';

export class IdempotencyConflictError extends Error {
  constructor(readonly existingExecutionId: string) {
    super('The pipeline/job identity already exists with different report content.');
  }
}

type TokenRecord = {
  id: string;
  product_key: ProductKey;
  token_hash: string;
  salt: string;
  revoked_at: Date | null;
};

type PersistOptions = {
  baseKey: string;
  identityKey: string;
  contentHash: string;
  artifactPath?: string | null;
};

const number = (value: unknown) => Number(value ?? 0);
const iso = (value: unknown) => new Date(value as string | number | Date).toISOString();

export class QualityRepository {
  constructor(private readonly database: Database) {}

  async seedProducts(): Promise<void> {
    for (const product of fictionalProducts) {
      await this.database.pool.query(
        `INSERT INTO products(id, product_key, name, description, framework, report_format, freshness_target_hours)
         VALUES($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT(product_key) DO UPDATE SET
           name=EXCLUDED.name, description=EXCLUDED.description, framework=EXCLUDED.framework,
           report_format=EXCLUDED.report_format, freshness_target_hours=EXCLUDED.freshness_target_hours,
           updated_at=NOW()`,
        [
          `product-${product.key}`,
          product.key,
          product.name,
          `${product.name} is a fictional product used exclusively for local demonstration.`,
          product.framework,
          product.reportFormat,
          product.freshnessTargetHours
        ]
      );
    }
  }

  async persistExecution(execution: NormalizedExecution, options: PersistOptions): Promise<{ id: string; duplicate: boolean }> {
    const client = await this.database.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [options.baseKey]);
      const existing = await client.query<{ id: string; content_hash: string }>(
        'SELECT id, content_hash FROM test_executions WHERE base_key = $1 FOR UPDATE',
        [options.baseKey]
      );
      if (existing.rows[0]) {
        if (existing.rows[0].content_hash === options.contentHash) {
          await client.query('COMMIT');
          return { id: existing.rows[0].id, duplicate: true };
        }
        throw new IdempotencyConflictError(existing.rows[0].id);
      }

      const productResult = await client.query<{ id: string }>('SELECT id FROM products WHERE product_key = $1', [execution.productKey]);
      const productId = productResult.rows[0]?.id;
      if (!productId) throw new Error(`Unknown product ${execution.productKey}`);

      const previousCases = await this.previousCases(client, productId, execution.origin);
      const currentCases = execution.suites.flatMap((suite) => suite.tests);
      const regressionDelta = calculateRegressionDelta(previousCases, currentCases);
      const id = randomUUID();
      const approvalRate = calculateApprovalRate(execution.summary.passed, execution.summary.executed);
      const qualityScore = calculateQualityScore(execution.summary.passed, execution.summary.executed, execution.summary.errors);

      await client.query(
        `INSERT INTO test_executions(
          id, product_id, base_key, identity_key, content_hash, report_format, source, origin, suite_type,
          status, total, executed, passed, failed, skipped, errors, duration_ms, approval_rate, quality_score,
          infrastructure_error, artifact_path, regression_delta, started_at, finished_at
        ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)`,
        [
          id, productId, options.baseKey, options.identityKey, options.contentHash, execution.reportFormat,
          execution.source, execution.origin, execution.suiteType, execution.status, execution.summary.total,
          execution.summary.executed, execution.summary.passed, execution.summary.failed, execution.summary.skipped,
          execution.summary.errors, execution.durationMs, approvalRate, qualityScore,
          execution.infrastructureError ? JSON.stringify(execution.infrastructureError) : null,
          options.artifactPath ?? null, JSON.stringify(regressionDelta), execution.startedAt, execution.finishedAt
        ]
      );

      await client.query(
        `INSERT INTO pipeline_metadata(
          id, execution_id, branch, commit_sha, pipeline_id, pipeline_url, job_id, job_name, job_url, artifact_url, environment
        ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [randomUUID(), id, execution.branch, execution.commitSha, execution.pipelineId, execution.pipelineUrl,
          execution.jobId, execution.jobName, execution.jobUrl, execution.artifactUrl, execution.environment]
      );

      for (const [suiteIndex, suite] of execution.suites.entries()) {
        const suiteId = randomUUID();
        await client.query(
          `INSERT INTO test_suites(id, execution_id, name, status, total, executed, passed, failed, skipped, errors, position)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [suiteId, id, suite.name, suite.status, suite.total, suite.executed, suite.passed, suite.failed, suite.skipped, suite.errors, suiteIndex]
        );
        for (const [testIndex, test] of suite.tests.entries()) {
          await client.query(
            `INSERT INTO test_case_results(
              id, suite_id, stable_key, framework, file_path, suite_path, title, status, duration_ms,
              error_type, error_message, expected_value, actual_value, sanitized_stack, position
            ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
            [randomUUID(), suiteId, test.stableKey, test.framework, test.file, JSON.stringify(test.suitePath), test.title,
              test.status, test.durationMs, test.error?.type ?? null, test.error?.message ?? null,
              test.error?.expected ?? null, test.error?.actual ?? null, test.error?.stack ?? null, testIndex]
          );
        }
      }
      await client.query('COMMIT');
      return { id, duplicate: false };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async previousCases(
    client: pg.PoolClient,
    productId: string,
    origin: NormalizedExecution['origin']
  ): Promise<Array<{ stableKey: string; status: string }>> {
    const result = await client.query<{ stable_key: string; status: string }>(
      `SELECT tc.stable_key, tc.status
       FROM test_case_results tc
       JOIN test_suites ts ON ts.id = tc.suite_id
       WHERE ts.execution_id = (
         SELECT id FROM test_executions
         WHERE product_id = $1 AND origin = $2
         ORDER BY created_at DESC, id DESC LIMIT 1
       )`,
      [productId, origin]
    );
    return result.rows.map((row) => ({ stableKey: row.stable_key, status: row.status }));
  }

  async listProducts(): Promise<Record<string, unknown>[]> {
    const products = await this.database.pool.query(
      `SELECT p.*, e.id execution_id, e.status execution_status, e.total, e.executed, e.passed, e.failed,
              e.skipped, e.errors, e.approval_rate, e.quality_score, e.finished_at, e.origin,
              pm.branch, pm.pipeline_id, pm.commit_sha
       FROM products p
       LEFT JOIN LATERAL (
         SELECT * FROM test_executions x WHERE x.product_id=p.id
         ORDER BY CASE WHEN x.origin='EXTERNAL_CI' THEN 0 ELSE 1 END, x.created_at DESC, x.id DESC LIMIT 1
       ) e ON TRUE
       LEFT JOIN pipeline_metadata pm ON pm.execution_id=e.id
       ORDER BY p.name`
    );
    return products.rows.map((row) => {
      const lastExecutionAt = row.finished_at ? iso(row.finished_at) : null;
      const freshness = calculateFreshness(lastExecutionAt, row.freshness_target_hours);
      const status = !row.execution_id ? 'NO_EXECUTION' : row.execution_status === 'ERROR' ? 'ERROR' : freshness === 'FRESH' ? 'ACTIVE' : 'STALE';
      return {
        key: row.product_key,
        name: row.name,
        description: row.description,
        framework: row.framework,
        reportFormat: row.report_format,
        status,
        executionStatus: row.execution_status ?? 'NOT_EXECUTED',
        total: number(row.total),
        executed: number(row.executed),
        passed: number(row.passed),
        failed: number(row.failed),
        skipped: number(row.skipped),
        infrastructureErrors: number(row.errors),
        approvalRate: row.approval_rate === null ? null : number(row.approval_rate),
        qualityScore: row.quality_score === null ? null : number(row.quality_score),
        freshness,
        lastExecutionAt,
        branch: row.branch ?? 'not-executed',
        pipeline: row.pipeline_id ?? 'not-executed',
        commit: row.commit_sha ?? 'not-executed',
        statusLabel: row.execution_status === 'ERROR' ? 'Infrastructure error — tests did not execute' : status === 'NO_EXECUTION' ? 'No execution' : 'Latest persisted execution',
        origin: row.origin ?? null,
        isOfficial: row.origin === 'EXTERNAL_CI',
        syntheticData: true
      };
    });
  }

  async dashboard(): Promise<Record<string, unknown>> {
    const products = await this.listProducts();
    const officialProducts = products.filter((product) => product.origin === 'EXTERNAL_CI');
    const executable = officialProducts.filter((product) => number(product.executed) > 0);
    const executed = executable.reduce((sum, product) => sum + number(product.executed), 0);
    const passed = executable.reduce((sum, product) => sum + number(product.passed), 0);
    const failed = executable.reduce((sum, product) => sum + number(product.failed), 0);
    const errors = officialProducts.reduce((sum, product) => sum + number(product.infrastructureErrors), 0);
    return {
      qualityScore: calculateQualityScore(passed, executed, errors),
      approvalRate: calculateApprovalRate(passed, executed),
      testsExecuted: executed,
      passed,
      failed,
      infrastructureErrors: errors,
      products: products.length,
      productsWithRecentExecution: officialProducts.filter((product) => product.freshness === 'FRESH').length,
      productsStale: products.length - officialProducts.filter((product) => product.freshness === 'FRESH').length,
      automationCoverage: demoAutomationCoverageSummary.percentage,
      latestRegression: officialProducts.map((product) => product.lastExecutionAt as string | null).filter(Boolean).sort().at(-1) ?? null,
      officialProducts: officialProducts.length,
      productsSummary: products
    };
  }

  async getProduct(key: string): Promise<Record<string, unknown> | null> {
    const products = await this.listProducts();
    const product = products.find((entry) => entry.key === key);
    if (!product) return null;
    const latest = await this.database.pool.query<{ regression_delta: unknown }>(
      `SELECT e.regression_delta FROM test_executions e JOIN products p ON p.id=e.product_id
       WHERE p.product_key=$1
       ORDER BY CASE WHEN e.origin='EXTERNAL_CI' THEN 0 ELSE 1 END, e.created_at DESC, e.id DESC LIMIT 1`, [key]
    );
    const suites = await this.database.pool.query(
      `SELECT s.name, s.status, s.total, s.executed, s.passed, s.failed, s.skipped, s.errors
       FROM test_suites s JOIN test_executions e ON e.id=s.execution_id JOIN products p ON p.id=e.product_id
       WHERE p.product_key=$1 AND e.id=(
         SELECT x.id FROM test_executions x WHERE x.product_id=p.id
         ORDER BY CASE WHEN x.origin='EXTERNAL_CI' THEN 0 ELSE 1 END, x.created_at DESC, x.id DESC LIMIT 1
       )
       ORDER BY s.position`, [key]
    );
    return {
      ...product,
      regressionDelta: latest.rows[0]?.regression_delta ?? { newFailures: 0, recovered: 0, persistentFailures: 0, newTests: 0, removedTests: 0 },
      suites: suites.rows
    };
  }

  async listExecutions(productKey?: string): Promise<Record<string, unknown>[]> {
    const values: unknown[] = [];
    const filter = productKey ? 'WHERE p.product_key=$1' : '';
    if (productKey) values.push(productKey);
    const result = await this.database.pool.query(
      `SELECT e.*, p.product_key, p.name product_name FROM test_executions e
       JOIN products p ON p.id=e.product_id ${filter} ORDER BY e.created_at DESC, e.id DESC`, values
    );
    return result.rows.map((row) => ({
      id: row.id,
      productKey: row.product_key,
      productName: row.product_name,
      date: iso(row.finished_at),
      status: row.status,
      total: row.total,
      executed: row.executed,
      passed: row.passed,
      failed: row.failed,
      skipped: row.skipped,
      infrastructureErrors: row.errors,
      approval: row.approval_rate === null ? null : number(row.approval_rate),
      qualityScore: row.quality_score === null ? null : number(row.quality_score),
      duration: row.duration_ms,
      source: row.source,
      origin: row.origin,
      reportFormat: row.report_format,
      suiteType: row.suite_type
    }));
  }

  async getExecution(id: string): Promise<Record<string, unknown> | null> {
    const executionResult = await this.database.pool.query(
      `SELECT e.*, p.product_key, p.name product_name, pm.branch, pm.commit_sha, pm.pipeline_id,
              pm.pipeline_url, pm.job_id, pm.job_name, pm.job_url, pm.artifact_url, pm.environment
       FROM test_executions e JOIN products p ON p.id=e.product_id
       JOIN pipeline_metadata pm ON pm.execution_id=e.id WHERE e.id=$1`, [id]
    );
    const row = executionResult.rows[0];
    if (!row) return null;
    const suiteResult = await this.database.pool.query('SELECT * FROM test_suites WHERE execution_id=$1 ORDER BY position', [id]);
    const suites = [];
    for (const suite of suiteResult.rows) {
      const tests = await this.database.pool.query('SELECT * FROM test_case_results WHERE suite_id=$1 ORDER BY position', [suite.id]);
      suites.push({
        id: suite.id,
        name: suite.name,
        status: suite.status,
        total: suite.total,
        executed: suite.executed,
        passed: suite.passed,
        failed: suite.failed,
        skipped: suite.skipped,
        errors: suite.errors,
        tests: tests.rows.map((test) => ({
          stableKey: test.stable_key,
          framework: test.framework,
          file: test.file_path,
          suitePath: test.suite_path,
          title: test.title,
          status: test.status,
          durationMs: test.duration_ms,
          error: test.error_message ? {
            type: test.error_type,
            message: test.error_message,
            expected: test.expected_value,
            actual: test.actual_value,
            stack: test.sanitized_stack
          } : null
        }))
      });
    }
    return {
      id: row.id,
      productKey: row.product_key,
      productName: row.product_name,
      status: row.status,
      reportFormat: row.report_format,
      source: row.source,
      origin: row.origin,
      suiteType: row.suite_type,
      startedAt: iso(row.started_at),
      finishedAt: iso(row.finished_at),
      durationMs: row.duration_ms,
      summary: { total: row.total, executed: row.executed, passed: row.passed, failed: row.failed, skipped: row.skipped, errors: row.errors },
      approvalRate: row.approval_rate === null ? null : number(row.approval_rate),
      qualityScore: row.quality_score === null ? null : number(row.quality_score),
      infrastructureError: row.infrastructure_error,
      artifact: row.artifact_path ? { localPath: row.artifact_path, rawReportExposed: false } : null,
      regressionDelta: row.regression_delta,
      pipeline: {
        branch: row.branch, commitSha: row.commit_sha, pipelineId: row.pipeline_id, pipelineUrl: row.pipeline_url,
        jobId: row.job_id, jobName: row.job_name, jobUrl: row.job_url, artifactUrl: row.artifact_url, environment: row.environment
      },
      suites
    };
  }

  async insertToken(record: { id: string; productKey: ProductKey; prefix: string; hash: string; salt: string; rotatedFromId?: string | null }): Promise<void> {
    await this.database.pool.query(
      `INSERT INTO integration_tokens(id, product_id, token_prefix, token_hash, salt, rotated_from_id)
       SELECT $1,id,$3,$4,$5,$6 FROM products WHERE product_key=$2`,
      [record.id, record.productKey, record.prefix, record.hash, record.salt, record.rotatedFromId ?? null]
    );
  }

  async tokenById(id: string): Promise<TokenRecord | null> {
    const result = await this.database.pool.query<TokenRecord>(
      `SELECT t.id, p.product_key, t.token_hash, t.salt, t.revoked_at FROM integration_tokens t
       JOIN products p ON p.id=t.product_id WHERE t.id=$1`, [id]
    );
    return result.rows[0] ?? null;
  }

  async latestActiveToken(productKey: ProductKey): Promise<{ id: string } | null> {
    const result = await this.database.pool.query<{ id: string }>(
      `SELECT t.id FROM integration_tokens t JOIN products p ON p.id=t.product_id
       WHERE p.product_key=$1 AND t.revoked_at IS NULL ORDER BY t.created_at DESC LIMIT 1`, [productKey]
    );
    return result.rows[0] ?? null;
  }

  async revokeTokens(productKey: ProductKey): Promise<number> {
    const result = await this.database.pool.query(
      `UPDATE integration_tokens SET revoked_at=NOW() WHERE revoked_at IS NULL
       AND product_id=(SELECT id FROM products WHERE product_key=$1)`, [productKey]
    );
    return result.rowCount ?? 0;
  }

  async externalCiStatus(): Promise<'EXTERNAL_CI_INTEGRATION_PENDING' | 'EXTERNAL_CI_ACTIVE'> {
    const result = await this.database.pool.query<{ products: string }>(
      `SELECT COUNT(DISTINCT p.product_key)::text products
       FROM test_executions e
       JOIN products p ON p.id=e.product_id
       WHERE e.origin='EXTERNAL_CI' AND p.product_key IN ('shopsphere','servicedesk')`
    );
    return Number(result.rows[0]?.products ?? 0) === 2
      ? 'EXTERNAL_CI_ACTIVE'
      : 'EXTERNAL_CI_INTEGRATION_PENDING';
  }

  async createDemoRun(input: {
    id: string;
    product: ProductKey;
    suite: string;
    mode: string;
    artifactPath: string;
    runnerMode: 'local' | 'hosted-preview';
    previewStatus: 'EXTERNAL_CI_INTEGRATION_PENDING' | 'EXTERNAL_CI_ACTIVE' | null;
  }): Promise<void> {
    await this.database.pool.query(
      `INSERT INTO demo_runs(
        id, product_key, suite_type, mode, state, progress_message, artifact_path, runner_mode, preview_status
       ) VALUES($1,$2,$3,$4,'QUEUED','Queued',$5,$6,$7)`,
      [input.id, input.product, input.suite, input.mode, input.artifactPath, input.runnerMode, input.previewStatus]
    );
  }

  async updateDemoRun(id: string, values: { state: string; message: string; executionId?: string; error?: string }): Promise<void> {
    await this.database.pool.query(
      `UPDATE demo_runs SET state=$2, progress_message=$3,
       execution_id=COALESCE($4,execution_id), error_message=COALESCE($5,error_message),
       started_at=CASE WHEN $2='RUNNING' THEN COALESCE(started_at,NOW()) ELSE started_at END,
       finished_at=CASE WHEN $2 IN ('COMPLETED','FAILED') THEN NOW() ELSE finished_at END WHERE id=$1`,
      [id, values.state, values.message, values.executionId ?? null, values.error ?? null]
    );
  }

  async getDemoRun(id: string): Promise<Record<string, unknown> | null> {
    const result = await this.database.pool.query('SELECT * FROM demo_runs WHERE id=$1', [id]);
    const row = result.rows[0];
    if (!row) return null;
    return {
      runId: row.id, product: row.product_key, suite: row.suite_type, mode: row.mode,
      state: row.state, progressMessage: row.progress_message, executionId: row.execution_id,
      runnerMode: row.runner_mode, previewStatus: row.preview_status,
      error: row.error_message, createdAt: iso(row.created_at), startedAt: row.started_at ? iso(row.started_at) : null,
      finishedAt: row.finished_at ? iso(row.finished_at) : null
    };
  }

  async listDemoRuns(): Promise<Record<string, unknown>[]> {
    const result = await this.database.pool.query('SELECT id FROM demo_runs ORDER BY created_at DESC LIMIT 50');
    const runs = await Promise.all(result.rows.map((row) => this.getDemoRun(row.id)));
    return runs.filter((run): run is Record<string, unknown> => run !== null);
  }

  async failInterruptedDemoRuns(): Promise<number> {
    const result = await this.database.pool.query(
      `UPDATE demo_runs SET state='FAILED', progress_message='Interrupted by application restart',
       error_message='The previous worker stopped before completion.', finished_at=NOW()
       WHERE state IN ('QUEUED','RUNNING','PROCESSING_REPORT')`
    );
    return result.rowCount ?? 0;
  }

  async clearAllForTests(): Promise<void> {
    await this.resetDemoData();
  }

  async resetDemoData(): Promise<void> {
    await this.database.pool.query('TRUNCATE demo_runs, integration_tokens, test_case_results, test_suites, pipeline_metadata, test_executions CASCADE');
  }
}
