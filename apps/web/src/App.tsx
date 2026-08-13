import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
  useLocation,
  useParams
} from 'react-router-dom';
import {
  createDemoRun,
  fetchAllExecutions,
  fetchDashboard,
  fetchDemoRun,
  fetchExecution,
  fetchExecutions,
  fetchProduct,
  fetchProducts
} from './api';
import type {
  DashboardResponse,
  DemoRun,
  Execution,
  ProductSummary,
  RegressionDelta
} from './types';

const menuItems = [
  { label: 'Overview', to: '/' },
  { label: 'Pipeline Lab', to: '/pipeline-lab' },
  { label: 'Products', to: '/products' },
  { label: 'Executions', to: '/executions' },
  { label: 'Coverage', to: '/coverage' },
  { label: 'Integrations', to: '/integrations' },
  { label: 'Automation Plan', to: '/automation-plan' },
  { label: 'Video Evidence', to: '/video-evidence' },
  { label: 'Documentation', to: '/documentation' },
  { label: 'How it works', to: '/how-it-works' },
  { label: 'Platform Health', to: '/platform-health' }
];

function formatDate(value: string | null) {
  if (!value) return 'No execution';
  return new Date(value).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function formatApproval(value: number | null) {
  if (value === null) return 'No execution';
  return `${value.toFixed(1)}%`;
}

function formatDuration(duration: number) {
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function statusClass(value: string) {
  return value.toLowerCase().replaceAll('_', '-');
}

function formatReport(value: string) {
  if (value === 'mochawesome') return 'Mochawesome';
  if (value === 'playwright-json-v1') return 'playwright-json-v1';
  if (value === 'mobile-e2e-json-v1') return 'mobile-e2e-json-v1';
  return value;
}

function PageHeader({
  eyebrow,
  title,
  description,
  demo = true,
  status
}: {
  eyebrow: string;
  title: string;
  description?: string;
  demo?: boolean;
  status?: string;
}) {
  return (
    <header className="topbar" aria-label="Page header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description ? <p className="page-description">{description}</p> : null}
      </div>
      <div className="header-badges">
        {status ? <span className={`pill ${statusClass(status)}`}>{status}</span> : null}
        {demo ? <span className="demo-badge">DEMO DATA</span> : null}
      </div>
    </header>
  );
}

function Feedback({ children, error = false }: { children: React.ReactNode; error?: boolean }) {
  return (
    <div className={`message-panel${error ? ' error-message' : ''}`} role={error ? 'alert' : 'status'} aria-live="polite">
      {children}
    </div>
  );
}

function StatCard({ label, value, subtitle }: { label: string; value: string; subtitle: string }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{subtitle}</small>
    </article>
  );
}

function OverviewPage() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const load = () => fetchDashboard()
      .then((payload) => { setDashboard(payload); setFailed(false); })
      .catch(() => setFailed(true));
    void load();
    const interval = window.setInterval(load, 5_000);
    return () => window.clearInterval(interval);
  }, []);

  if (failed) return <Feedback error>Dashboard data could not be loaded.</Feedback>;
  if (!dashboard) return <Feedback>Loading dashboard…</Feedback>;

  return (
    <>
      <PageHeader
        eyebrow="Platform overview"
        title="QualityOps Hub"
        description="Synthetic quality signals for three fictional products."
      />

      <section className="stats-grid" aria-label="Quality summary">
        <StatCard label="Quality Score" value={dashboard.qualityScore === null ? 'No execution' : `${dashboard.qualityScore.toFixed(1)}%`} subtitle="Approval minus explicit infrastructure penalty" />
        <StatCard label="Approval Rate" value={formatApproval(dashboard.approvalRate)} subtitle="Passed / executed" />
        <StatCard label="Executed" value={String(dashboard.testsExecuted)} subtitle="Latest product runs" />
        <StatCard label="Passed" value={String(dashboard.passed)} subtitle="Successful tests" />
        <StatCard label="Failed" value={String(dashboard.failed)} subtitle="Functional failures" />
        <StatCard label="Infrastructure Errors" value={String(dashboard.infrastructureErrors)} subtitle="Synthetic historical incidents" />
        <StatCard label="Products" value={String(dashboard.products)} subtitle="Monitored demo products" />
        <StatCard
          label="Automation Coverage"
          value={dashboard.automationCoverage === null ? 'Coverage not configured' : `${dashboard.automationCoverage.toFixed(1)}%`}
          subtitle="No fictional coverage is inferred"
        />
      </section>

      <section className="panel" aria-labelledby="overview-products-title">
        <div className="section-header">
          <h2 id="overview-products-title">Products</h2>
          <span>{dashboard.productsSummary.length} fictional products monitored</span>
        </div>
        <div className="product-grid">
          {dashboard.productsSummary.map((product) => (
            <article key={product.key} className="product-card">
              <header>
                <div>
                  <p className="product-name">{product.name}</p>
                  <small>{product.framework}</small>
                </div>
                <span className={`pill ${statusClass(product.status)}`}>{product.status}</span>
              </header>

              <dl>
                <div><dt>Approval</dt><dd>{formatApproval(product.approvalRate)}</dd></div>
                <div><dt>Executed</dt><dd>{product.executed}</dd></div>
                <div><dt>Passed</dt><dd>{product.passed}</dd></div>
                <div><dt>Failed</dt><dd>{product.failed}</dd></div>
                <div><dt>Infrastructure</dt><dd>{product.infrastructureErrors}</dd></div>
                <div><dt>Freshness</dt><dd>{product.freshness}</dd></div>
              </dl>

              <span className={`pill ${statusClass(product.executionStatus)}`}>Latest outcome: {product.executionStatus.replaceAll('_', ' ')}</span>
              {product.origin ? <span className={`origin-badge ${product.origin === 'DEMO_PIPELINE' ? 'live' : 'seeded'}`}>{product.origin === 'DEMO_PIPELINE' ? 'Live demo run' : 'Seeded demo history'}</span> : null}

              <NavLink className="detail-link" to={`/products/${product.key}`}>
                View details
              </NavLink>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function ProductsPage() {
  const [products, setProducts] = useState<ProductSummary[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetchProducts()
      .then((payload) => setProducts(payload.products))
      .catch(() => setFailed(true));
  }, []);

  return (
    <>
      <PageHeader eyebrow="Inventory" title="Products" description="Only synthetic portfolio data is shown here." />
      <section className="panel full-width" aria-labelledby="products-table-title">
        <div className="section-header">
          <h2 id="products-table-title">Monitored products</h2>
          <span>{products?.length ?? 0} entries</span>
        </div>
        {failed ? <Feedback error>Products could not be loaded.</Feedback> : null}
        {!failed && products === null ? <Feedback>Loading products…</Feedback> : null}
        {products ? (
          <div className="table-wrap" tabIndex={0} aria-label="Scrollable products table">
            <table>
              <caption className="sr-only">Synthetic product quality summary</caption>
              <thead>
                <tr>
                  <th>Product</th><th>Framework</th><th>Status</th><th>Last run</th>
                  <th>Total</th><th>Passed</th><th>Failed</th><th>Approval</th><th>Freshness</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.key}>
                    <td><NavLink to={`/products/${product.key}`}>{product.name}</NavLink></td>
                    <td>{product.framework}</td>
                    <td><span className={`pill ${statusClass(product.status)}`}>{product.status}</span></td>
                    <td>{formatDate(product.lastExecutionAt)}</td>
                    <td>{product.total}</td><td>{product.passed}</td><td>{product.failed}</td>
                    <td>{formatApproval(product.approvalRate)}</td><td>{product.freshness}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </>
  );
}

type ProductSuite = {
  name: string;
  status: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
};

type ProductDetailModel = ProductSummary & {
  suites?: ProductSuite[];
  regressionDelta: RegressionDelta;
};

function ProductDetailPage() {
  const { productKey } = useParams();
  const [product, setProduct] = useState<ProductDetailModel | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');

  useEffect(() => {
    if (!productKey) {
      setState('missing');
      return;
    }

    const load = () => Promise.all([fetchProduct(productKey), fetchExecutions(productKey)])
      .then(([productPayload, executionPayload]) => {
        setProduct(productPayload.product);
        setExecutions(executionPayload.executions);
        setState('ready');
      })
      .catch((error: Error) => setState(error.message.startsWith('404:') ? 'missing' : 'error'));
    setState('loading');
    void load();
    const interval = window.setInterval(load, 5_000);
    return () => window.clearInterval(interval);
  }, [productKey]);

  if (state === 'loading') return <Feedback>Loading product details…</Feedback>;
  if (state === 'missing') return <><PageHeader eyebrow="Product detail" title="Product not found" /><Feedback error>The requested fictional product does not exist.</Feedback></>;
  if (state === 'error' || !product) return <Feedback error>Product details could not be loaded.</Feedback>;

  const delta = product.regressionDelta;

  return (
    <>
      <PageHeader eyebrow="Product detail" title={product.name} description={product.statusLabel} status={product.status} />

      {product.key === 'servicedesk' ? (
        <div className="notice warning-notice" role="status"><strong>Stale state:</strong> the latest synthetic execution is older than its demo freshness target.</div>
      ) : null}
      {product.key === 'pocketwallet' ? (
        <div className="notice recovery-notice" role="status">
          <strong>MOBILE HARNESS DEMO:</strong> synthetic evidence only. It shows recovery after a historical infrastructure error and does not represent a real Android execution.
        </div>
      ) : null}

      <section className="panel" aria-labelledby="product-summary-title">
        <h2 id="product-summary-title">Execution summary</h2>
        <div className="metrics-grid">
          <div><span>Framework</span><strong>{product.framework}</strong></div>
          <div><span>Report format</span><strong>{formatReport(product.reportFormat)}</strong></div>
          <div><span>Branch</span><strong>{product.branch}</strong></div>
          <div><span>Pipeline</span><strong>{product.pipeline}</strong></div>
          <div><span>Commit</span><strong>{product.commit}</strong></div>
          <div><span>Approval</span><strong>{formatApproval(product.approvalRate)}</strong></div>
          <div><span>Freshness</span><strong>{product.freshness}</strong></div>
          <div><span>Latest outcome</span><strong>{product.executionStatus}</strong></div>
        </div>
      </section>

      <section className="panel" aria-labelledby="regression-title">
        <div className="section-header">
          <h2 id="regression-title">Regression delta</h2>
          <span>Compared by stable scenario identity</span>
        </div>
        <div className="delta-grid">
          <div><span>New failures</span><strong>{delta.newFailures}</strong></div>
          <div><span>Recovered tests</span><strong>{delta.recovered}</strong></div>
          <div><span>Persistent failures</span><strong>{delta.persistentFailures}</strong></div>
          <div><span>New tests</span><strong>{delta.newTests}</strong></div>
          <div><span>Removed tests</span><strong>{delta.removedTests}</strong></div>
        </div>
      </section>

      <section className="panel" aria-labelledby="suite-title">
        <h2 id="suite-title">Test suites</h2>
        <div className="table-wrap" tabIndex={0} aria-label="Scrollable test suites table">
          <table>
            <caption className="sr-only">Latest synthetic suite results for {product.name}</caption>
            <thead><tr><th>Suite</th><th>Status</th><th>Total</th><th>Passed</th><th>Failed</th><th>Skipped</th></tr></thead>
            <tbody>
              {(product.suites ?? []).map((suite) => (
                <tr key={suite.name}>
                  <td>{suite.name}</td><td><span className={`pill ${statusClass(suite.status)}`}>{suite.status}</span></td>
                  <td>{suite.total}</td><td>{suite.passed}</td><td>{suite.failed}</td><td>{suite.skipped}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" aria-labelledby="product-history-title">
        <h2 id="product-history-title">Execution history</h2>
        <ExecutionTable executions={executions} showProduct={false} productNames={{ [product.key]: product.name }} />
      </section>
    </>
  );
}

function ExecutionTable({
  executions,
  productNames,
  showProduct = true
}: {
  executions: Execution[];
  productNames: Record<string, string>;
  showProduct?: boolean;
}) {
  return (
    <div className="table-wrap" tabIndex={0} aria-label="Scrollable executions table">
      <table>
        <caption className="sr-only">Synthetic execution history</caption>
        <thead>
          <tr>
            {showProduct ? <th>Product</th> : null}
            <th>Date</th><th>Status</th><th>Executed</th><th>Passed</th><th>Failed</th>
            <th>Infrastructure</th><th>Approval</th><th>Duration</th><th>Origin</th><th>Details</th>
          </tr>
        </thead>
        <tbody>
          {executions.map((entry) => (
            <tr key={entry.id}>
              {showProduct ? <td>{productNames[entry.productKey] ?? entry.productKey}</td> : null}
              <td>{formatDate(entry.date)}</td>
              <td><span className={`pill ${statusClass(entry.status)}`}>{entry.status.replaceAll('_', ' ')}</span></td>
              <td>{entry.executed}</td><td>{entry.passed}</td><td>{entry.failed}</td>
              <td>{entry.infrastructureErrors}</td><td>{formatApproval(entry.approval)}</td>
              <td>{formatDuration(entry.duration)}</td>
              <td><span className={`origin-badge ${entry.origin === 'DEMO_PIPELINE' ? 'live' : 'seeded'}`}>{entry.origin === 'DEMO_PIPELINE' ? 'Live demo run' : 'Seeded demo history'}</span></td>
              <td><NavLink to={`/executions/${entry.id}`}>View execution</NavLink></td>
            </tr>
          ))}
          {executions.length === 0 ? (
            <tr><td className="empty-state" colSpan={showProduct ? 11 : 10}>No executions match the selected filters.</td></tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function ExecutionsPage() {
  const [items, setItems] = useState<Execution[] | null>(null);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const load = () => fetchProducts()
      .then(async (payload) => {
        setProducts(payload.products);
        setItems(await fetchAllExecutions(payload.products.map((product: ProductSummary) => product.key)));
        setFailed(false);
      })
      .catch(() => setFailed(true));
    void load();
    const interval = window.setInterval(load, 5_000);
    return () => window.clearInterval(interval);
  }, []);

  const filtered = (items ?? []).filter((entry) => {
    const productMatches = filterProduct === 'all' || entry.productKey === filterProduct;
    const statusMatches = filterStatus === 'all' || entry.status === filterStatus;
    return productMatches && statusMatches;
  });
  const productNames = Object.fromEntries(products.map((product) => [product.key, product.name]));

  return (
    <>
      <PageHeader eyebrow="Execution history" title="Executions" description="Passed, failed, stale and infrastructure outcomes use synthetic demo runs." />
      <section className="panel full-width" aria-labelledby="execution-table-title">
        <div className="section-header">
          <h2 id="execution-table-title">Run history</h2>
          <span aria-live="polite">{filtered.length} entries</span>
        </div>

        <div className="toolbar" aria-label="Execution filters">
          <label>Product
            <select value={filterProduct} onChange={(event) => setFilterProduct(event.target.value)}>
              <option value="all">All products</option>
              {products.map((product) => <option key={product.key} value={product.key}>{product.name}</option>)}
            </select>
          </label>
          <label>Status
            <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="PASSED">Passed</option><option value="FAILED">Failed</option>
              <option value="ERROR">Infrastructure error</option>
            </select>
          </label>
        </div>

        {failed ? <Feedback error>Executions could not be loaded.</Feedback> : null}
        {!failed && items === null ? <Feedback>Loading executions…</Feedback> : null}
        {items ? <ExecutionTable executions={filtered} productNames={productNames} /> : null}
      </section>
    </>
  );
}

type ExecutionDetailsModel = {
  id: string;
  productKey: string;
  productName: string;
  status: string;
  reportFormat: string;
  source: string;
  origin: string;
  suiteType: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  summary: { total: number; executed: number; passed: number; failed: number; skipped: number; errors: number };
  approvalRate: number | null;
  infrastructureError: { message: string; stack: string | null } | null;
  artifact: { localPath: string; rawReportExposed: false } | null;
  regressionDelta: RegressionDelta;
  pipeline: Record<string, string | null>;
  suites: Array<{
    id: string;
    name: string;
    status: string;
    total: number;
    executed: number;
    passed: number;
    failed: number;
    skipped: number;
    errors: number;
    tests: Array<{
      stableKey: string;
      framework: string;
      file: string;
      suitePath: string[];
      title: string;
      status: string;
      durationMs: number;
      error: { message: string; expected: string | null; actual: string | null; stack: string | null } | null;
    }>;
  }>;
};

function PipelineLabPage() {
  const [product, setProduct] = useState<'shopsphere' | 'servicedesk' | 'pocketwallet'>('shopsphere');
  const [suite, setSuite] = useState<'SMOKE' | 'REGRESSION'>('REGRESSION');
  const [mode, setMode] = useState<'SUCCESS' | 'FUNCTIONAL_FAILURE' | 'INFRASTRUCTURE_FAILURE'>('SUCCESS');
  const [run, setRun] = useState<DemoRun | null>(null);
  const [result, setResult] = useState<ExecutionDetailsModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = run !== null && !['COMPLETED', 'FAILED'].includes(run.state);

  useEffect(() => {
    if (!run || ['COMPLETED', 'FAILED'].includes(run.state)) return;
    const interval = window.setInterval(() => {
      fetchDemoRun(run.runId)
        .then(async (payload) => {
          setRun(payload.run);
          if (payload.run.state === 'COMPLETED' && payload.run.executionId) {
            const details = await fetchExecution(payload.run.executionId);
            setResult(details.execution);
          }
        })
        .catch(() => setError('Unable to poll the demo run.'));
    }, 2_000);
    return () => window.clearInterval(interval);
  }, [run]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setResult(null);
    try {
      const payload = await createDemoRun({ product, suite, mode });
      setRun(payload.run);
    } catch {
      setError('Pipeline Lab is unavailable. Confirm the local demo flag and PostgreSQL service.');
    }
  };

  const progress = ['QUEUED', 'RUNNING', 'PROCESSING_REPORT', 'COMPLETED'];
  const currentIndex = run ? progress.indexOf(run.state) : -1;
  return (
    <>
      <PageHeader eyebrow="Local demo only" title="Pipeline Lab" description="Run a fixed, allow-listed fictional pipeline through the same authenticated ingestion API used by external CI." />
      <div className="notice warning-notice"><strong>Pipeline Lab is a local/demo-only feature.</strong> It accepts no commands or filesystem paths.</div>
      <section className="panel pipeline-layout" aria-labelledby="pipeline-form-title">
        <form onSubmit={submit} className="pipeline-form">
          <h2 id="pipeline-form-title">Run a demo pipeline</h2>
          <label>Product<select aria-label="Product" value={product} onChange={(event) => setProduct(event.target.value as typeof product)} disabled={busy}>
            <option value="shopsphere">ShopSphere</option><option value="servicedesk">ServiceDesk</option><option value="pocketwallet">PocketWallet</option>
          </select></label>
          <label>Suite<select aria-label="Suite" value={suite} onChange={(event) => setSuite(event.target.value as typeof suite)} disabled={busy}>
            <option value="SMOKE">Smoke</option><option value="REGRESSION">Regression</option>
          </select></label>
          <label>Execution mode<select aria-label="Execution mode" value={mode} onChange={(event) => setMode(event.target.value as typeof mode)} disabled={busy}>
            <option value="SUCCESS">Success</option><option value="FUNCTIONAL_FAILURE">Functional failure</option><option value="INFRASTRUCTURE_FAILURE">Infrastructure failure</option>
          </select></label>
          <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Pipeline running…' : 'Run demo pipeline'}</button>
        </form>
        <div className="pipeline-progress" aria-live="polite">
          <h2>Progress</h2>
          <ol>
            {progress.map((state, index) => <li key={state} className={index <= currentIndex ? 'complete' : ''} aria-current={run?.state === state ? 'step' : undefined}>{state === 'PROCESSING_REPORT' ? 'Processing report' : state[0] + state.slice(1).toLowerCase()}</li>)}
            {run?.state === 'FAILED' ? <li className="failed" aria-current="step">Failed</li> : null}
          </ol>
          {run ? <p><strong>Run ID:</strong> <code>{run.runId}</code><br />{run.progressMessage}</p> : <p>Select only the mapped options above to begin.</p>}
          {error || run?.error ? <Feedback error>{error ?? run?.error}</Feedback> : null}
        </div>
      </section>
      {result ? (
        <section className="panel" aria-labelledby="pipeline-result-title">
          <div className="section-header"><h2 id="pipeline-result-title">Pipeline result</h2><span>{result.productName}</span></div>
          {result.status === 'ERROR' ? <div className="notice infrastructure-notice"><strong>Infrastructure error — tests did not execute</strong></div> : null}
          <div className="metrics-grid">
            <div><span>Execution ID</span><strong>{result.id}</strong></div><div><span>Status</span><strong>{result.status}</strong></div>
            <div><span>Executed</span><strong>{result.summary.executed}</strong></div><div><span>Passed</span><strong>{result.summary.passed}</strong></div>
            <div><span>Failed</span><strong>{result.summary.failed}</strong></div><div><span>Errors</span><strong>{result.summary.errors}</strong></div>
            <div><span>Duration</span><strong>{formatDuration(result.durationMs)}</strong></div>
          </div>
          <NavLink className="primary-link" to={`/executions/${result.id}`}>View execution</NavLink>
        </section>
      ) : null}
    </>
  );
}

function ExecutionDetailsPage() {
  const { executionId } = useParams();
  const [execution, setExecution] = useState<ExecutionDetailsModel | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!executionId) return;
    fetchExecution(executionId).then((payload) => setExecution(payload.execution)).catch(() => setFailed(true));
  }, [executionId]);
  if (failed) return <Feedback error>Execution could not be loaded.</Feedback>;
  if (!execution) return <Feedback>Loading execution details…</Feedback>;
  return (
    <>
      <PageHeader eyebrow="Execution details" title={`${execution.productName} execution`} description={execution.id} status={execution.status} />
      {execution.status === 'ERROR' ? <div className="notice infrastructure-notice"><strong>Infrastructure error — tests did not execute</strong><p>{execution.infrastructureError?.message}</p></div> : null}
      <section className="panel"><h2>Summary</h2><div className="metrics-grid">
        <div><span>Total</span><strong>{execution.summary.total}</strong></div><div><span>Executed</span><strong>{execution.summary.executed}</strong></div>
        <div><span>Passed</span><strong>{execution.summary.passed}</strong></div><div><span>Failed</span><strong>{execution.summary.failed}</strong></div>
        <div><span>Skipped</span><strong>{execution.summary.skipped}</strong></div><div><span>Errors</span><strong>{execution.summary.errors}</strong></div>
        <div><span>Approval</span><strong>{formatApproval(execution.approvalRate)}</strong></div><div><span>Duration</span><strong>{formatDuration(execution.durationMs)}</strong></div>
      </div></section>
      <section className="panel"><h2>Pipeline metadata</h2><div className="metrics-grid">
        {Object.entries(execution.pipeline).map(([key, value]) => <div key={key}><span>{key}</span><strong>{value ?? 'Not provided'}</strong></div>)}
        <div><span>Source</span><strong>{execution.source}</strong></div><div><span>Origin</span><strong><span className={`origin-badge ${execution.origin === 'DEMO_PIPELINE' ? 'live' : 'seeded'}`}>{execution.origin === 'DEMO_PIPELINE' ? 'Live demo run' : 'Seeded demo history'}</span></strong></div>
        <div><span>Raw format</span><strong>{execution.reportFormat}</strong></div><div><span>Suite type</span><strong>{execution.suiteType}</strong></div>
      </div></section>
      <section className="panel"><h2>Regression delta</h2><div className="delta-grid">
        <div><span>New failures</span><strong>{execution.regressionDelta.newFailures}</strong></div><div><span>Recovered</span><strong>{execution.regressionDelta.recovered}</strong></div>
        <div><span>Persistent failures</span><strong>{execution.regressionDelta.persistentFailures}</strong></div><div><span>New tests</span><strong>{execution.regressionDelta.newTests}</strong></div>
        <div><span>Removed tests</span><strong>{execution.regressionDelta.removedTests}</strong></div>
      </div></section>
      {execution.suites.map((suite) => <section className="panel" key={suite.id}><div className="section-header"><h2>{suite.name}</h2><span className={`pill ${statusClass(suite.status)}`}>{suite.status}</span></div>
        {suite.tests.length === 0 ? <Feedback>No test cases executed.</Feedback> : <div className="test-list">{suite.tests.map((test) => <article key={test.stableKey} className="test-result">
          <header><strong>{test.title}</strong><span className={`pill ${statusClass(test.status)}`}>{test.status}</span></header>
          <p>{test.framework} · {test.file} · {test.durationMs}ms</p>
          {test.error ? <div className="failure-detail"><strong>{test.error.message}</strong><span>Expected: {test.error.expected ?? 'Not available'}</span><span>Actual: {test.error.actual ?? 'Not available'}</span>{test.error.stack ? <pre>{test.error.stack}</pre> : null}</div> : null}
        </article>)}</div>}
      </section>)}
      <section className="panel"><h2>Artifact metadata</h2>{execution.artifact ? <p><code>{execution.artifact.localPath}</code><br />Raw report is retained locally and is not exposed by default.</p> : <p>Seeded history has no local artifact.</p>}</section>
    </>
  );
}

const flowSteps = [
  ['Code change', 'A developer updates the product code.'],
  ['GitHub Actions', 'The fictional continuous-integration workflow starts.'],
  ['Automated Tests', 'Configured test suites exercise the change.'],
  ['Test Report', 'The framework exports structured results.'],
  ['Artifact', 'The workflow keeps the report as traceable evidence.'],
  ['QualityOps API', 'The platform receives the artifact.'],
  ['Normalizer', 'Framework-specific fields become one common model.'],
  ['Persistence', 'Normalized history is stored for comparison.'],
  ['Dashboard', 'Teams review trends, failures and freshness.']
];

function HowItWorksPage() {
  return (
    <>
      <PageHeader
        eyebrow="Public architecture"
        title="How it works"
        description="From a code change to a quality decision, in one traceable flow."
        demo={false}
      />
      <section className="panel" aria-labelledby="flow-title">
        <h2 id="flow-title">From change to decision</h2>
        <ol className="flow-list" aria-label="QualityOps Hub processing flow">
          {flowSteps.map(([title, description], index) => (
            <li key={title}>
              <div className="flow-number">{index + 1}</div>
              <div><strong>{title}</strong><span>{description}</span></div>
              {index < flowSteps.length - 1 ? <span className="flow-arrow" aria-hidden="true">↓</span> : null}
            </li>
          ))}
        </ol>
        <p className="footnote">QualityOps Hub consolidates test evidence; it does not replace the test frameworks or the engineering decisions made from their results.</p>
      </section>
    </>
  );
}

function ComingSoonPage({ title }: { title: string }) {
  return (
    <>
      <PageHeader eyebrow="Planned capability" title={title} demo={false} />
      <section className="panel"><Feedback>Coming in next milestone</Feedback></section>
    </>
  );
}

function NotFoundPage() {
  return (
    <>
      <PageHeader eyebrow="Navigation" title="Page not found" demo={false} />
      <Feedback error>The requested route does not exist.</Feedback>
    </>
  );
}

function AppShell() {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!drawerOpen || !sidebarRef.current) return;

    const sidebar = sidebarRef.current;
    const focusable = Array.from(sidebar.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
    const focusTimer = window.setTimeout(() => focusable[0]?.focus(), 0);
    document.body.classList.add('drawer-visible');

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setDrawerOpen(false);
        window.setTimeout(() => menuButtonRef.current?.focus(), 0);
        return;
      }

      if (event.key !== 'Tab' || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('drawer-visible');
    };
  }, [drawerOpen]);

  const closeDrawer = () => {
    setDrawerOpen(false);
    window.setTimeout(() => menuButtonRef.current?.focus(), 0);
  };

  const routes = useMemo(() => (
    <Routes>
      <Route path="/" element={<OverviewPage />} />
      <Route path="/pipeline-lab" element={<PipelineLabPage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/products/:productKey" element={<ProductDetailPage />} />
      <Route path="/executions" element={<ExecutionsPage />} />
      <Route path="/executions/:executionId" element={<ExecutionDetailsPage />} />
      <Route path="/coverage" element={<ComingSoonPage title="Coverage" />} />
      <Route path="/integrations" element={<ComingSoonPage title="Integrations" />} />
      <Route path="/automation-plan" element={<ComingSoonPage title="Automation Plan" />} />
      <Route path="/video-evidence" element={<ComingSoonPage title="Video Evidence" />} />
      <Route path="/documentation" element={<ComingSoonPage title="Documentation" />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      <Route path="/platform-health" element={<ComingSoonPage title="Platform Health" />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  ), []);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="mobile-header">
        <span className="mobile-brand"><span className="brand-mark" aria-hidden="true">Q</span>QualityOps Hub</span>
        <button
          ref={menuButtonRef}
          className="menu-button"
          type="button"
          aria-label="Open navigation"
          aria-controls="primary-sidebar"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
        >
          <span aria-hidden="true">☰</span>
        </button>
      </header>

      <div className={`drawer-overlay${drawerOpen ? ' visible' : ''}`} aria-hidden="true" onClick={closeDrawer} />
      <aside
        id="primary-sidebar"
        ref={sidebarRef}
        className={`sidebar${drawerOpen ? ' open' : ''}`}
        aria-label="Sidebar navigation"
        aria-modal={drawerOpen ? true : undefined}
        role={drawerOpen ? 'dialog' : undefined}
      >
        <div className="sidebar-heading">
          <NavLink className="brand" to="/" aria-label="QualityOps Hub overview">
            <span className="brand-mark" aria-hidden="true">Q</span>
            <span><strong>QualityOps</strong><small>Hub</small></span>
          </NavLink>
          <button className="drawer-close" type="button" aria-label="Close navigation" onClick={closeDrawer}>×</button>
        </div>
        <nav aria-label="Primary navigation">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              end={item.to === '/'}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main id="main-content" className="main-panel" tabIndex={-1}>{routes}</main>
    </div>
  );
}

function App() {
  return <BrowserRouter><AppShell /></BrowserRouter>;
}

export default App;
