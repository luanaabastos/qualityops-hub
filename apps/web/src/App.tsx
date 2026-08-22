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
  fetchDemoConfig,
  fetchDemoRun,
  fetchExecution,
  fetchExecutions,
  fetchReadiness,
  fetchProduct,
  fetchProducts
} from './api';
import { pollDemoRun } from './demo-polling';
import type {
  DashboardResponse,
  DemoConfig,
  DemoRun,
  Execution,
  PlatformReadiness,
  ProductSummary,
  RegressionDelta
} from './types';
import {
  AutomationPlanPage,
  CoveragePage,
  DocumentationPage,
  IntegrationsPage,
  VideoEvidencePage
} from './PortfolioPages';

const menuItems = [
  { label: 'Overview', to: '/' },
  { label: 'Pipeline Lab', to: '/pipeline-lab' },
  { label: 'Products', to: '/products' },
  { label: 'Executions', to: '/executions' },
  { label: 'Automation Coverage', to: '/coverage' },
  { label: 'Integrations', to: '/integrations' },
  { label: 'Automation Plan', to: '/automation-plan' },
  { label: 'Video Evidence', to: '/video-evidence' },
  { label: 'Docs', to: '/documentation' },
  { label: 'How It Works', to: '/how-it-works' },
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
  return value.toLowerCase().replaceAll('_', '-').replaceAll(' ', '-');
}

function formatReport(value: string) {
  if (value === 'mochawesome') return 'Mochawesome';
  if (value === 'playwright-json-v1') return 'playwright-json-v1';
  if (value === 'mobile-e2e-json-v1') return 'mobile-e2e-json-v1';
  return value;
}

function frameworkLabel(value: string) {
  if (value === 'mochawesome') return 'Cypress';
  if (value === 'playwright-json-v1') return 'Playwright';
  if (value === 'mobile-e2e-json-v1') return 'Mobile Harness Demo';
  return value;
}

type ExecutionOrigin = NonNullable<Execution['origin']>;

function originClass(origin: ExecutionOrigin) {
  if (origin === 'DEMO_PIPELINE') return 'live';
  if (origin === 'EXTERNAL_CI') return 'external';
  return 'seeded';
}

function originLabel(origin: ExecutionOrigin) {
  if (origin === 'DEMO_PIPELINE') return 'Local Demo';
  if (origin === 'EXTERNAL_CI') return 'Official CI';
  return 'Demo Data';
}

function originSourceLabel(origin: ExecutionOrigin | null) {
  if (origin === 'EXTERNAL_CI') return 'GitHub Actions';
  if (origin === 'DEMO_PIPELINE') return 'Local demo runner';
  if (origin === 'SEEDED_DEMO') return 'Synthetic seed';
  return 'No execution';
}

const helpText = {
  approvalRate: 'Percentage of executed tests that passed.',
  qualityScore: 'Current quality indicator calculated from official CI evidence.',
  regressionDelta: 'Changes in test failures compared with the previous official execution.',
  automationCoverage: 'Percentage of mapped quality scenarios currently covered by automated tests.'
} as const;

function HelpTerm({ label, description }: { label: string; description: string }) {
  return (
    <span className="help-term">
      <span>{label}</span>
      <button type="button" className="help-trigger" aria-label={`${label}: ${description}`}>?</button>
      <span className="help-tooltip" role="tooltip">{description}</span>
    </span>
  );
}

export function formatMetadataValue(key: string, value: string, origin: string) {
  if (!key.toLowerCase().endsWith('url')) return value;
  try {
    const parsed = new URL(value);
    return parsed.origin === origin ? `${parsed.pathname}${parsed.search}${parsed.hash}` : value;
  } catch {
    return value;
  }
}

function PageHeader({
  eyebrow,
  title,
  description,
  demo = false,
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
        {demo ? <span className="demo-badge" title="Synthetic data used only to demonstrate the interface">DEMO DATA</span> : null}
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

function StatCard({ label, value, subtitle, help }: { label: string; value: string; subtitle: string; help?: string }) {
  return (
    <article className="stat-card">
      {help ? <HelpTerm label={label} description={help} /> : <span>{label}</span>}
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
        eyebrow="TestOps Hub"
        title="Automated test results, in one place."
        description="Turn CI executions into traceable quality metrics, history and regression insights."
      />

      <section className="hero-intro" aria-label="TestOps Hub introduction">
        <p className="hero-tagline">From CI test execution to actionable quality insights.</p>
        <p>TestOps Hub collects test reports from CI pipelines, normalizes results from different frameworks and turns them into a clear view of product quality.</p>
        <NavLink className="primary-link" to="/how-it-works">See how it works</NavLink>
      </section>

      <section className="panel clarity-panel" aria-labelledby="why-testops-title">
        <div>
          <p className="eyebrow">The problem</p>
          <h2 id="why-testops-title">Why TestOps Hub?</h2>
          <p>Test results are usually spread across GitHub Actions, artifacts, reports, logs, frameworks and older executions.</p>
          <p><strong>Instead of checking each source manually, TestOps Hub provides one consolidated view of test quality.</strong></p>
        </div>
        <ol className="plain-flow" aria-label="Test evidence flow">
          {['CI Pipeline', 'Automated Tests', 'Test Reports', 'TestOps Hub', 'History + Metrics + Regression Signals'].map((step) => <li key={step}>{step}</li>)}
        </ol>
      </section>

      <section className="evidence-grid" aria-labelledby="evidence-key-title">
        <h2 id="evidence-key-title">What is real and what is demo?</h2>
        <article><span className="origin-badge external">Official CI</span><p>Real browser tests executed by GitHub Actions and ingested into the platform.</p></article>
        <article><span className="origin-badge live">Hosted Preview</span><p>Safe hosted demonstration that does not create official quality evidence.</p></article>
        <article><span className="origin-badge seeded">Demo Data</span><p>Synthetic data used only to demonstrate parts of the interface.</p></article>
      </section>

      <section className="stats-grid" aria-label="Quality summary">
        <StatCard label="Quality Score" value={dashboard.qualityScore === null ? 'No official execution' : `${dashboard.qualityScore.toFixed(1)}%`} subtitle="Current indicator from official CI evidence" help={helpText.qualityScore} />
        <StatCard label="Approval Rate" value={formatApproval(dashboard.approvalRate)} subtitle="Percentage of executed tests that passed" help={helpText.approvalRate} />
        <StatCard label="Executed" value={String(dashboard.testsExecuted)} subtitle="Tests included in latest official CI runs" />
        <StatCard label="Passed" value={String(dashboard.passed)} subtitle="Tests that completed successfully" />
        <StatCard label="Failed" value={String(dashboard.failed)} subtitle="Tests that detected a functional failure" />
        <StatCard label="Infrastructure Errors" value={String(dashboard.infrastructureErrors)} subtitle="Runs blocked by the environment or runner" />
        <StatCard label="Products" value={String(dashboard.products)} subtitle={`${dashboard.officialProducts} with official CI history`} />
        <StatCard
          label="Automation Coverage"
          value={dashboard.automationCoverage === null ? 'Not configured' : `${dashboard.automationCoverage.toFixed(1)}%`}
          subtitle={dashboard.automationCoverage === null ? 'No eligible test plan is configured' : 'Mapped scenarios covered by automated tests'}
          help={helpText.automationCoverage}
        />
      </section>

      <section className="explanation-strip" aria-label="Metric definitions">
        <details>
          <summary>How Quality Score works</summary>
          <p><strong>Quality Score is not Approval Rate.</strong> It starts with passed / executed and subtracts 10 points per explicit infrastructure error, capped at a 30-point penalty. No execution produces no score.</p>
        </details>
        <div className="freshness-legend" aria-label="Freshness legend">
          <strong>Freshness</strong>
          <span><span className="pill fresh">Fresh</span> within target</span>
          <span><span className="pill stale">Stale</span> up to twice the target</span>
          <span><span className="pill overdue">Overdue</span> beyond twice the target</span>
        </div>
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
              {product.origin ? <span className={`origin-badge ${originClass(product.origin)}`} title={product.isOfficial ? 'Real browser evidence from GitHub Actions' : 'Synthetic demonstration data'}>{originLabel(product.origin)}</span> : null}

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
      <PageHeader eyebrow="Evidence inventory" title="Products" description="See which framework, data source and evidence type support each fictional product." />
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
              <caption className="sr-only">Product quality evidence summary</caption>
              <thead>
                <tr>
                  <th>Product</th><th>Framework</th><th>Data source</th><th>Evidence</th><th>Status</th><th>Last official CI</th>
                  <th>Executed</th><th>Passed</th><th>Failed</th><th>Approval</th><th>Freshness</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.key}>
                    <td><NavLink to={`/products/${product.key}`}>{product.name}</NavLink></td>
                    <td>{product.framework}</td>
                    <td>{originSourceLabel(product.origin)}</td>
                    <td>{product.origin ? <span className={`origin-badge ${originClass(product.origin)}`}>{originLabel(product.origin)}</span> : 'No evidence'}</td>
                    <td><span className={`pill ${statusClass(product.status)}`}>{product.status}</span></td>
                    <td>{product.isOfficial ? formatDate(product.lastExecutionAt) : 'Not available — demo only'}</td>
                    <td>{product.executed}</td><td>{product.passed}</td><td>{product.failed}</td>
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
          <div><span>Adapter</span><strong>{formatReport(product.reportFormat)}</strong></div>
          <div><span>Latest result</span><strong>{product.executionStatus}</strong></div>
          <div><span>Execution count</span><strong>{executions.length}</strong></div>
          <div><span>Last run</span><strong>{formatDate(product.lastExecutionAt)}</strong></div>
          <div><span>Approval</span><strong>{formatApproval(product.approvalRate)}</strong></div>
          <div><span>{product.isOfficial ? 'Official freshness' : 'Demo freshness'}</span><strong>{product.freshness}</strong></div>
          <div><span>Source</span><strong>{originSourceLabel(product.origin)}</strong></div>
        </div>
      </section>

      <section className="panel" aria-labelledby="regression-title">
        <div className="section-header">
          <h2 id="regression-title" aria-label="Regression Delta"><HelpTerm label="Regression Delta" description={helpText.regressionDelta} /></h2>
          <span>{product.isOfficial ? 'Compared with prior GitHub Actions history' : 'Compared within the same demo origin'}</span>
        </div>
        <div className="delta-grid">
          <div><span>New failures</span><strong>{delta.newFailures}</strong><small>Started failing now</small></div>
          <div><span>Recovered</span><strong>{delta.recovered}</strong><small>Failing before, passing now</small></div>
          <div><span>Persistent failures</span><strong>{delta.persistentFailures}</strong><small>Still failing</small></div>
          <div><span>New tests</span><strong>{delta.newTests}</strong><small>First seen in this report</small></div>
          <div><span>Removed tests</span><strong>{delta.removedTests}</strong><small>No longer in this report</small></div>
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
        <caption className="sr-only">Execution history</caption>
        <thead>
          <tr>
            {showProduct ? <th>Product</th> : null}
            <th>Run time</th><th>Framework</th><th>Branch</th><th>Status</th><th>Executed</th><th>Passed</th><th>Failed</th>
            <th>Infrastructure errors</th><th>Duration</th><th>Data source</th><th>Evidence</th><th>Details</th>
          </tr>
        </thead>
        <tbody>
          {executions.map((entry) => (
            <tr key={entry.id}>
              {showProduct ? <td>{productNames[entry.productKey] ?? entry.productKey}</td> : null}
              <td>{formatDate(entry.date)}</td>
              <td>{entry.framework || frameworkLabel(entry.reportFormat)}</td>
              <td><code>{entry.branch}</code></td>
              <td><span className={`pill ${statusClass(entry.status)}`}>{entry.status.replaceAll('_', ' ')}</span></td>
              <td>{entry.executed}</td><td>{entry.passed}</td><td>{entry.failed}</td>
              <td>{entry.infrastructureErrors}</td><td>{formatDuration(entry.duration)}</td>
              <td>{originSourceLabel(entry.origin)}</td>
              <td><span className={`origin-badge ${originClass(entry.origin)}`}>{originLabel(entry.origin)}</span></td>
              <td><NavLink to={`/executions/${entry.id}`}>View execution</NavLink></td>
            </tr>
          ))}
          {executions.length === 0 ? (
            <tr><td className="empty-state" colSpan={showProduct ? 13 : 12}>No executions match the selected product and status. Adjust the filters to see other evidence.</td></tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function ExecutionsPage() {
  const pageSize = 10;
  const [items, setItems] = useState<Execution[] | null>(null);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const load = () => fetchProducts()
      .then(async (payload) => {
        setProducts(payload.products);
        const executions = await fetchAllExecutions(payload.products.map((product: ProductSummary) => product.key));
        setItems(executions.sort((left: Execution, right: Execution) => Date.parse(right.date) - Date.parse(left.date)));
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
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const firstIndex = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize;
  const visibleItems = filtered.slice(firstIndex, firstIndex + pageSize);
  const rangeStart = filtered.length === 0 ? 0 : firstIndex + 1;
  const rangeEnd = Math.min(firstIndex + pageSize, filtered.length);

  return (
    <>
      <PageHeader eyebrow="Traceable run history" title="Executions" description="Compare when tests ran, what framework produced the report, where it came from and whether it counts as official evidence." />
      <section className="panel full-width" aria-labelledby="execution-table-title">
        <div className="section-header">
          <h2 id="execution-table-title">Run history</h2>
          <span aria-live="polite">{filtered.length} entries</span>
        </div>

        <div className="toolbar" aria-label="Execution filters">
          <label>Product
            <select value={filterProduct} onChange={(event) => { setFilterProduct(event.target.value); setPage(1); }}>
              <option value="all">All products</option>
              {products.map((product) => <option key={product.key} value={product.key}>{product.name}</option>)}
            </select>
          </label>
          <label>Status
            <select value={filterStatus} onChange={(event) => { setFilterStatus(event.target.value); setPage(1); }}>
              <option value="all">All statuses</option>
              <option value="PASSED">Passed</option><option value="FAILED">Failed</option>
              <option value="ERROR">Infrastructure error</option>
            </select>
          </label>
        </div>

        {failed ? <Feedback error>Executions could not be loaded.</Feedback> : null}
        {!failed && items === null ? <Feedback>Loading executions…</Feedback> : null}
        {items ? <>
          <ExecutionTable executions={visibleItems} productNames={productNames} />
          <div className="pagination" aria-label="Execution history pagination">
            <span aria-live="polite">Showing {rangeStart}–{rangeEnd} of {filtered.length}</span>
            <div>
              <button type="button" className="secondary-button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
              <span>Page {currentPage} of {totalPages}</span>
              <button type="button" className="secondary-button" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</button>
            </div>
          </div>
        </> : null}
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
  origin: ExecutionOrigin;
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

const modeDescriptions = {
  SUCCESS: 'All expected demo tests pass.',
  FUNCTIONAL_FAILURE: 'One deterministic assertion fails.',
  INFRASTRUCTURE_FAILURE: 'The runner fails before tests execute.'
} as const;

function PipelineLabPage() {
  const [product, setProduct] = useState<'shopsphere' | 'servicedesk' | 'pocketwallet'>('shopsphere');
  const [suite, setSuite] = useState<'SMOKE' | 'REGRESSION'>('REGRESSION');
  const [mode, setMode] = useState<'SUCCESS' | 'FUNCTIONAL_FAILURE' | 'INFRASTRUCTURE_FAILURE'>('SUCCESS');
  const [run, setRun] = useState<DemoRun | null>(null);
  const [result, setResult] = useState<ExecutionDetailsModel | null>(null);
  const [demoConfig, setDemoConfig] = useState<DemoConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = run !== null && !['COMPLETED', 'FAILED', 'ERROR'].includes(run.state);
  const hostedPreview = demoConfig?.runnerMode === 'hosted-preview';
  const externalCiActive = demoConfig?.externalCiStatus === 'EXTERNAL_CI_ACTIVE';

  useEffect(() => {
    const controller = new AbortController();
    void fetchDemoConfig(controller.signal)
      .then((payload: DemoConfig) => setDemoConfig(payload))
      .catch(() => {
        if (!controller.signal.aborted) setError('Pipeline Lab configuration is unavailable.');
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!run || ['COMPLETED', 'FAILED', 'ERROR'].includes(run.state)) return;
    const controller = new AbortController();
    void pollDemoRun({
      runId: run.runId,
      signal: controller.signal,
      fetchRun: fetchDemoRun,
      fetchExecution,
      onRun: setRun,
      onResult: setResult,
      onMessage: setError
    });
    return () => controller.abort();
  }, [run?.runId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setResult(null);
    try {
      const payload = await createDemoRun({ product, suite, mode });
      setRun(payload.run);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : '';
      if (message.includes('capacity')) setError('Demo runner capacity reached. Wait for an active run to finish, then try again.');
      else if (message.includes('limit')) setError('Rate limited. Wait briefly before starting another demo run.');
      else setError('Pipeline Lab is unavailable. Confirm API and PostgreSQL readiness.');
    }
  };

  const reset = () => {
    setRun(null);
    setResult(null);
    setError(null);
  };

  const progress = ['QUEUED', 'RUNNING', 'PROCESSING_REPORT', 'COMPLETED'];
  const currentIndex = run ? progress.indexOf(run.state) : -1;
  return (
    <>
      <PageHeader
        eyebrow={hostedPreview ? 'Hosted Preview' : 'Local Demo'}
        title="Pipeline Lab"
        description={hostedPreview
          ? 'Demonstrate the ingestion flow safely without creating official CI evidence.'
          : 'Run a fixed fictional pipeline through the same authenticated ingestion flow used by CI.'}
      />
      {hostedPreview ? (
        <div className="notice warning-notice">
          <strong><span className="origin-badge live">Hosted Preview</span> {externalCiActive ? 'Official CI is active.' : 'Official CI is not configured yet.'}</strong>
          <p>{externalCiActive
            ? 'Hosted Preview demonstrates the ingestion flow without creating official CI evidence. It does not run Cypress or Playwright on Render Free; real browser executions and reports are produced by GitHub Actions.'
            : 'This preview demonstrates the flow without starting Cypress or Playwright, generating reports or changing official metrics.'} PocketWallet remains a synthetic Mobile Harness Demo, not an Android device run.</p>
        </div>
      ) : null}
      <div className="notice info-notice"><strong>This lab is safe and bounded.</strong> Visitors choose mapped options only; it accepts no commands, URLs, environment values or filesystem paths.</div>
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
          <div className="mode-guide" aria-label="Mode guidance">
            {Object.entries(modeDescriptions).map(([value, description]) => (
              <div className={mode === value ? 'selected' : ''} key={value}>
                <strong>{value === 'SUCCESS' ? 'Success' : value === 'FUNCTIONAL_FAILURE' ? 'Functional Failure' : 'Infrastructure Failure'}</strong>
                <span>{hostedPreview
                  ? 'Preview selection only; no test outcome is produced.'
                  : value === 'INFRASTRUCTURE_FAILURE' && product === 'pocketwallet'
                    ? 'The mobile harness stops before tests execute.'
                    : description}</span>
              </div>
            ))}
          </div>
          <button className="primary-button" type="submit" disabled={busy || !demoConfig}>
            {busy ? 'Pipeline running…' : hostedPreview ? 'Preview pipeline flow' : 'Run demo pipeline'}
          </button>
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
            <div><span>Product</span><strong>{result.productName}</strong></div><div><span>Suite</span><strong>{run?.suite ?? result.suiteType}</strong></div>
            <div><span>Mode</span><strong>{run?.mode.replaceAll('_', ' ') ?? 'Demo run'}</strong></div><div><span>Status</span><strong>{result.status}</strong></div>
            <div><span>Executed</span><strong>{result.summary.executed}</strong></div><div><span>Passed</span><strong>{result.summary.passed}</strong></div>
            <div><span>Failed</span><strong>{result.summary.failed}</strong></div><div><span>Errors</span><strong>{result.summary.errors}</strong></div>
            <div><span>Duration</span><strong>{formatDuration(result.durationMs)}</strong></div>
          </div>
          <div className="result-actions">
            <NavLink className="primary-link" to={`/executions/${result.id}`}>View execution</NavLink>
            <button className="secondary-button" type="button" onClick={reset}>Run another demo</button>
          </div>
        </section>
      ) : null}
      {!result && run?.state === 'COMPLETED' && run.runnerMode === 'hosted-preview' ? (
        <section className="panel" aria-labelledby="pipeline-preview-title">
          <div className="section-header"><h2 id="pipeline-preview-title">Hosted Preview complete</h2><span>{externalCiActive ? 'Official CI active' : 'Official CI not configured'}</span></div>
          <div className="notice warning-notice">
            <strong>No official execution was created.</strong>
            <p>This preview demonstrates the orchestration boundary only. Test counts, reports, artifacts, and dashboard history remain reserved for authenticated ingestion from real external CI.</p>
          </div>
          <div className="result-actions"><button className="secondary-button" type="button" onClick={reset}>Preview another flow</button></div>
        </section>
      ) : null}
    </>
  );
}

function CopyableValue({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (!navigator.clipboard) return;
    void navigator.clipboard.writeText(value).then(() => setCopied(true));
  };
  return (
    <div className="metadata-entry">
      <span>{label}</span>
      <div className="metadata-line">
        <code className="metadata-value" title={value}>{value}</code>
        <button className="copy-button" type="button" aria-label={`Copy ${label}`} onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
      </div>
    </div>
  );
}

function metadataLabel(key: string) {
  const labels: Record<string, string> = {
    branch: 'Branch',
    commitSha: 'Commit',
    pipelineId: 'Pipeline ID',
    pipelineUrl: 'Workflow URL',
    jobId: 'Job ID',
    jobName: 'Job name',
    jobUrl: 'Job URL',
    artifactUrl: 'Report artifact',
    environment: 'Environment'
  };
  return labels[key] ?? key;
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
  const copyableKeys = new Set(['commitSha', 'pipelineId', 'jobId']);
  return (
    <>
      <PageHeader eyebrow="Execution details" title={`${execution.productName} execution`} description={execution.id} status={execution.status} />
      {execution.status === 'ERROR' ? <div className="notice infrastructure-notice"><strong>Infrastructure error — tests did not execute</strong><p>{execution.infrastructureError?.message}</p></div> : null}
      <section className="panel" aria-labelledby="execution-summary-title"><h2 id="execution-summary-title">Execution summary</h2><div className="metrics-grid">
        <div><span>Product</span><strong>{execution.productName}</strong></div><div><span>Status</span><strong>{execution.status}</strong></div>
        <div><span>Source</span><strong>{originSourceLabel(execution.origin)}</strong></div><div><span>Evidence</span><strong><span className={`origin-badge ${originClass(execution.origin)}`}>{originLabel(execution.origin)}</span></strong></div>
        <div><span>Framework</span><strong>{frameworkLabel(execution.reportFormat)}</strong></div>
        <div><span>Branch</span><strong>{execution.pipeline.branch ?? 'Not provided'}</strong></div><div><span>Commit</span><strong>{execution.pipeline.commitSha ?? 'Not provided'}</strong></div>
        <div><span>Executed</span><strong>{execution.summary.executed}</strong></div><div><span>Passed</span><strong>{execution.summary.passed}</strong></div>
        <div><span>Failed</span><strong>{execution.summary.failed}</strong></div><div><span>Infrastructure errors</span><strong>{execution.summary.errors}</strong></div>
        <div><span>Started</span><strong>{formatDate(execution.startedAt)}</strong></div><div><span>Duration</span><strong>{formatDuration(execution.durationMs)}</strong></div>
      </div></section>
      <section className="panel" aria-labelledby="test-results-title">
        <h2 id="test-results-title">Test results</h2>
        {execution.suites.map((suite) => <article className="test-suite" key={suite.id}><div className="section-header"><h3>{suite.name}</h3><span className={`pill ${statusClass(suite.status)}`}>{suite.status}</span></div>
          {suite.tests.length === 0 ? <Feedback>No tests executed because this run ended before browser assertions started.</Feedback> : <div className="test-list">{suite.tests.map((test) => <article key={test.stableKey} className="test-result">
            <header><strong>{test.title}</strong><span className={`pill ${statusClass(test.status)}`}>{test.status}</span></header>
            <p>{test.framework} · {test.file} · {test.durationMs}ms</p>
            {test.error ? <div className="failure-detail"><strong>{test.error.message}</strong><span>Expected: {test.error.expected ?? 'Not available'}</span><span>Actual: {test.error.actual ?? 'Not available'}</span>{test.error.stack ? <pre>{test.error.stack}</pre> : null}</div> : null}
          </article>)}</div>}
        </article>)}
      </section>
      <section className="panel" aria-labelledby="execution-regression-title"><div className="section-header"><h2 id="execution-regression-title" aria-label="Regression Delta"><HelpTerm label="Regression Delta" description={helpText.regressionDelta} /></h2><span>Compared with the previous execution from the same evidence source</span></div><div className="delta-grid">
        <div><span>New failures</span><strong>{execution.regressionDelta.newFailures}</strong><small>Tests that started failing now</small></div><div><span>Recovered</span><strong>{execution.regressionDelta.recovered}</strong><small>Failing before, passing now</small></div>
        <div><span>Persistent failures</span><strong>{execution.regressionDelta.persistentFailures}</strong><small>Tests that remain failing</small></div><div><span>New tests</span><strong>{execution.regressionDelta.newTests}</strong><small>First seen in this report</small></div>
        <div><span>Removed tests</span><strong>{execution.regressionDelta.removedTests}</strong><small>No longer in this report</small></div>
      </div></section>
      <section className="panel" aria-labelledby="execution-evidence-title"><h2 id="execution-evidence-title">Artifacts and evidence</h2><p className="section-copy">Trace this normalized execution back to its CI workflow, job and retained report when those links are available.</p><div className="metrics-grid">
        {Object.entries(execution.pipeline).map(([key, value]) => {
          const label = metadataLabel(key);
          if (!value) return <div key={key}><span>{label}</span><strong>Not provided</strong></div>;
          const displayValue = formatMetadataValue(key, value, window.location.origin);
          return copyableKeys.has(key) || key.toLowerCase().endsWith('url')
            ? <CopyableValue key={key} label={label} value={displayValue} />
            : <div key={key}><span>{label}</span><strong>{displayValue}</strong></div>;
        })}
        <div><span>Data source</span><strong>{originSourceLabel(execution.origin)}</strong></div>
        <div><span>Report format</span><strong>{formatReport(execution.reportFormat)}</strong></div><div><span>Suite type</span><strong>{execution.suiteType}</strong></div>
      </div>{execution.artifact ? <p><code>{execution.artifact.localPath}</code><br />The raw local demo report is not exposed by the API.</p> : execution.pipeline.artifactUrl ? <p>The real report is retained by the linked CI artifact.</p> : <p>No retained artifact is associated with this synthetic demo execution.</p>}</section>
    </>
  );
}

const flowSteps = ['CI Pipeline', 'Automated Tests', 'Test Reports', 'TestOps Hub', 'History + Metrics + Regression Signals'];

function HowItWorksPage() {
  return (
    <>
      <PageHeader
        eyebrow="Start here"
        title="How It Works"
        description="A plain-language guide from a CI test run to a quality decision."
        demo={false}
      />
      <section className="panel" aria-labelledby="how-problem-title"><p className="eyebrow">1 · The problem</p><h2 id="how-problem-title">Evidence is spread across tools</h2><p>CI status, framework reports, artifacts, logs and older runs answer different questions. Reviewing them separately makes regressions harder to spot.</p></section>
      <section className="panel" aria-labelledby="flow-title">
        <p className="eyebrow">2 · The flow</p><h2 id="flow-title">From CI to one quality view</h2>
        <ol className="plain-flow" aria-label="TestOps Hub processing flow">{flowSteps.map((step) => <li key={step}>{step}</li>)}</ol>
        <p className="footnote">Instead of checking multiple pipelines and reports manually, the platform provides one consolidated view of test quality.</p>
      </section>
      <div className="how-grid">
        <section className="panel"><p className="eyebrow">3 · Real CI execution</p><h2>Browsers run in GitHub Actions</h2><p>Cypress and Playwright execute real browser scenarios. Their workflow, job and report artifact remain traceable.</p></section>
        <section className="panel"><p className="eyebrow">4 · Report normalization</p><h2>Different reports become comparable</h2><p>Versioned adapters validate Mochawesome, Playwright JSON and the Mobile Harness Demo, then map them to one execution model.</p></section>
        <section className="panel"><p className="eyebrow">5 · Persistence</p><h2>History is stored in PostgreSQL</h2><p>Authenticated reports, test cases and pipeline metadata are persisted together so each result can be traced over time.</p></section>
        <section className="panel"><p className="eyebrow">6 · Dashboard metrics</p><h2>Counts become understandable signals</h2><p>Executed, passed, failed, infrastructure errors, Approval Rate and Quality Score use only the latest official CI evidence.</p></section>
        <section className="panel"><p className="eyebrow">7 · Regression detection</p><h2>Changes are compared over time</h2><p>Regression Delta identifies tests that started failing, recovered, stayed broken, appeared or disappeared.</p></section>
        <section className="panel"><p className="eyebrow">8 · Demo vs official evidence</p><h2>The source is always visible</h2><p><strong>Official CI</strong> affects quality metrics. <strong>Hosted Preview</strong> demonstrates the flow safely. <strong>Demo Data</strong> is synthetic interface context.</p></section>
      </div>
    </>
  );
}

function PlatformHealthPage() {
  const [health, setHealth] = useState<PlatformReadiness | null>(null);
  const [apiUnavailable, setApiUnavailable] = useState(false);

  useEffect(() => {
    const load = () => fetchReadiness()
      .then((payload: PlatformReadiness) => {
        setHealth(payload);
        setApiUnavailable(false);
      })
      .catch(() => {
        setHealth(null);
        setApiUnavailable(true);
      });
    void load();
    const interval = window.setInterval(load, 5_000);
    return () => window.clearInterval(interval);
  }, []);

  const services = [
    { name: 'API', state: apiUnavailable ? 'unavailable' : health ? 'operational' : 'checking', detail: 'Receives dashboard and ingestion requests' },
    { name: 'Database', state: apiUnavailable ? 'unknown' : health?.database === 'ready' ? 'connected' : health?.database ?? 'checking', detail: 'PostgreSQL stores execution history' },
    { name: 'Browser execution', state: 'GitHub Actions', detail: 'Real Cypress and Playwright runs happen in external CI' },
    {
      name: 'Hosted runner',
      state: apiUnavailable ? 'unknown' : health?.demoRunnerMode === 'hosted-preview' ? 'preview only' : health?.backgroundJobs ?? 'checking',
      detail: health?.demoRunnerMode === 'hosted-preview'
        ? 'Demonstrates the flow without running a browser or creating official evidence'
        : 'Allow-listed local jobs'
    },
    { name: 'Object storage', state: 'not configured', detail: 'CI artifacts retain real reports; persistent uploads are not enabled' }
  ];

  return (
    <>
      <PageHeader eyebrow="Runtime status" title="Platform Health" description="Plain-language status for the API, database, browser execution and hosted preview." />
      {apiUnavailable ? <Feedback error>The API is unavailable. Dependent service states cannot be confirmed.</Feedback> : null}
      {!apiUnavailable && !health ? <Feedback>Checking platform services…</Feedback> : null}
      <section className="panel" aria-labelledby="platform-services-title">
        <div className="section-header"><h2 id="platform-services-title">Services</h2><span>Refreshes every 5 seconds</span></div>
        <div className="metrics-grid">
          {services.map((service) => (
            <div key={service.name}>
              <span>{service.name}</span>
              <strong><span className={`pill ${statusClass(service.state)}`}>{service.state}</span></strong>
              <small>{service.detail}</small>
            </div>
          ))}
        </div>
      </section>
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
      <Route path="/coverage" element={<CoveragePage />} />
      <Route path="/integrations" element={<IntegrationsPage />} />
      <Route path="/automation-plan" element={<AutomationPlanPage />} />
      <Route path="/video-evidence" element={<VideoEvidencePage />} />
      <Route path="/documentation" element={<DocumentationPage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      <Route path="/platform-health" element={<PlatformHealthPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  ), []);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="mobile-header">
        <span className="mobile-brand"><span className="brand-mark" aria-hidden="true">T</span>TestOps Hub</span>
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
          <NavLink className="brand" to="/" aria-label="TestOps Hub overview">
            <span className="brand-mark" aria-hidden="true">T</span>
            <span><strong>TestOps</strong><small>Hub</small></span>
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
