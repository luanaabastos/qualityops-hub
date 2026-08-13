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
  fetchAllExecutions,
  fetchDashboard,
  fetchExecutions,
  fetchProduct,
  fetchProducts
} from './api';
import type {
  DashboardResponse,
  Execution,
  ProductSummary,
  RegressionDelta
} from './types';

const menuItems = [
  { label: 'Overview', to: '/' },
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

function formatDate(value: string) {
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
    fetchDashboard()
      .then(setDashboard)
      .catch(() => setFailed(true));
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
        <StatCard label="Quality Score" value={`${dashboard.qualityScore.toFixed(1)}%`} subtitle="Weighted across executions" />
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

    setState('loading');
    Promise.all([fetchProduct(productKey), fetchExecutions(productKey)])
      .then(([productPayload, executionPayload]) => {
        setProduct(productPayload.product);
        setExecutions(executionPayload.executions);
        setState('ready');
      })
      .catch((error: Error) => setState(error.message.includes('Product') ? 'missing' : 'error'));
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
          <div><span>Report format</span><strong>{product.reportFormat}</strong></div>
          <div><span>Branch</span><strong>{product.branch}</strong></div>
          <div><span>Pipeline</span><strong>{product.pipeline}</strong></div>
          <div><span>Commit</span><strong>{product.commit}</strong></div>
          <div><span>Approval</span><strong>{formatApproval(product.approvalRate)}</strong></div>
          <div><span>Freshness</span><strong>{product.freshness}</strong></div>
        </div>
      </section>

      <section className="panel" aria-labelledby="regression-title">
        <div className="section-header">
          <h2 id="regression-title">Regression delta</h2>
          <span>Compared by stable scenario identity</span>
        </div>
        <div className="delta-grid">
          <div><span>New failures</span><strong>{delta.newFailures}</strong></div>
          <div><span>Recovered tests</span><strong>{delta.recoveredTests}</strong></div>
          <div><span>Persistent failures</span><strong>{delta.persistentFailures}</strong></div>
          <div><span>New tests</span><strong>{delta.newTests}</strong></div>
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
            <th>Infrastructure</th><th>Approval</th><th>Duration</th><th>Source</th>
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
              <td>{formatDuration(entry.duration)}</td><td>{entry.source}</td>
            </tr>
          ))}
          {executions.length === 0 ? (
            <tr><td className="empty-state" colSpan={showProduct ? 10 : 9}>No executions match the selected filters.</td></tr>
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
    fetchProducts()
      .then(async (payload) => {
        setProducts(payload.products);
        setItems(await fetchAllExecutions(payload.products.map((product: ProductSummary) => product.key)));
      })
      .catch(() => setFailed(true));
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
              <option value="INFRASTRUCTURE_ERROR">Infrastructure error</option><option value="STALE">Stale</option>
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
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/products/:productKey" element={<ProductDetailPage />} />
      <Route path="/executions" element={<ExecutionsPage />} />
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
