import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Link, Route, Routes, useParams } from 'react-router-dom';
import { fetchDashboard, fetchExecutions, fetchProduct, fetchProducts } from './api';
import type { DashboardResponse, Execution, ProductSummary } from './types';

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatApproval(value: number | null) {
  if (value === null) return 'No execution';
  return `${value.toFixed(1)}%`;
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

  useEffect(() => {
    fetchDashboard().then(setDashboard).catch(() => setDashboard(null));
  }, []);

  if (!dashboard) {
    return <div className="message-panel">Loading dashboard…</div>;
  }

  return (
    <>
      <header className="topbar" aria-label="Page header">
        <div>
          <p className="eyebrow">Platform overview</p>
          <h1>QualityOps Hub</h1>
        </div>
        <span className="demo-badge">DEMO DATA</span>
      </header>

      <section className="stats-grid" aria-label="Quality summary">
        <StatCard label="Quality Score" value={`${dashboard.qualityScore.toFixed(1)}%`} subtitle="Weighted across executions" />
        <StatCard label="Approval Rate" value={formatApproval(dashboard.approvalRate)} subtitle="Passed / executed" />
        <StatCard label="Executed" value={String(dashboard.testsExecuted)} subtitle="Total tests run" />
        <StatCard label="Passed" value={String(dashboard.passed)} subtitle="Successful tests" />
        <StatCard label="Failed" value={String(dashboard.failed)} subtitle="Functional failures" />
        <StatCard label="Infrastructure Errors" value={String(dashboard.infrastructureErrors)} subtitle="Non-functional failures" />
        <StatCard label="Products" value={String(dashboard.products)} subtitle="Monitored products" />
        <StatCard label="Automation Coverage" value={dashboard.automationCoverage === null ? 'Coverage not configured' : `${dashboard.automationCoverage.toFixed(1)}%`} subtitle="Scenario automation" />
      </section>

      <section className="panel">
        <div className="section-header">
          <h2>Products</h2>
          <span>{dashboard.productsSummary.length} products monitored</span>
        </div>
        <div className="product-grid">
          {dashboard.productsSummary.map((product) => (
            <article key={product.key} className="product-card">
              <header>
                <div>
                  <p className="product-name">{product.name}</p>
                  <small>{product.framework}</small>
                </div>
                <span className={`pill ${product.status.toLowerCase()}`}>{product.status}</span>
              </header>

              <dl>
                <div>
                  <dt>Approval</dt>
                  <dd>{formatApproval(product.approvalRate)}</dd>
                </div>
                <div>
                  <dt>Executed</dt>
                  <dd>{product.executed}</dd>
                </div>
                <div>
                  <dt>Passed</dt>
                  <dd>{product.passed}</dd>
                </div>
                <div>
                  <dt>Failed</dt>
                  <dd>{product.failed}</dd>
                </div>
                <div>
                  <dt>Skipped</dt>
                  <dd>{product.skipped}</dd>
                </div>
                <div>
                  <dt>Freshness</dt>
                  <dd>{product.freshness}</dd>
                </div>
              </dl>

              <Link className="detail-link" to={`/products/${product.key}`}>
                View details
              </Link>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function ProductsPage() {
  const [products, setProducts] = useState<ProductSummary[]>([]);

  useEffect(() => {
    fetchProducts().then((payload) => setProducts(payload.products)).catch(() => setProducts([]));
  }, []);

  return (
    <section className="panel full-width">
      <div className="section-header">
        <h2>Products</h2>
        <span>{products.length} entries</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Framework</th>
              <th>Status</th>
              <th>Last run</th>
              <th>Total</th>
              <th>Passed</th>
              <th>Failed</th>
              <th>Approval</th>
              <th>Freshness</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.key}>
                <td><Link to={`/products/${product.key}`}>{product.name}</Link></td>
                <td>{product.framework}</td>
                <td><span className={`pill ${product.status.toLowerCase()}`}>{product.status}</span></td>
                <td>{formatDate(product.lastExecutionAt)}</td>
                <td>{product.total}</td>
                <td>{product.passed}</td>
                <td>{product.failed}</td>
                <td>{formatApproval(product.approvalRate)}</td>
                <td>{product.freshness}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
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
};

function ProductDetailPage() {
  const { productKey } = useParams();
  const [product, setProduct] = useState<ProductDetailModel | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);

  useEffect(() => {
    if (!productKey) return;
    fetchProduct(productKey).then((payload) => setProduct(payload.product)).catch(() => setProduct(null));
    fetchExecutions(productKey).then((payload) => setExecutions(payload.executions)).catch(() => setExecutions([]));
  }, [productKey]);

  if (!product) {
    return <div className="message-panel">Product not found.</div>;
  }

  const previousExecution = executions[1];
  const newFailures = Math.max(product.failed - (previousExecution?.failed ?? 0), 0);
  const recovered = Math.max((previousExecution?.failed ?? 0) - product.failed, 0);

  return (
    <section className="panel">
      <div className="section-header">
        <h2>{product.name}</h2>
        <span className={`pill ${product.status.toLowerCase()}`}>{product.status}</span>
      </div>

      <div className="metrics-grid">
        <div><span>Framework</span><strong>{product.framework}</strong></div>
        <div><span>Branch</span><strong>{product.branch}</strong></div>
        <div><span>Pipeline</span><strong>{product.pipeline}</strong></div>
        <div><span>Commit</span><strong>{product.commit}</strong></div>
        <div><span>Approval</span><strong>{formatApproval(product.approvalRate)}</strong></div>
        <div><span>Freshness</span><strong>{product.freshness}</strong></div>
      </div>

      <div className="regression-grid">
        <div className="mini-panel">
          <h3>Regression delta</h3>
          <ul>
            <li>New failures: {newFailures}</li>
            <li>Recovered: {recovered}</li>
            <li>Persistent failures: {Math.max(product.failed, previousExecution?.failed ?? 0)}</li>
            <li>New tests: 2</li>
          </ul>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Suite</th>
              <th>Status</th>
              <th>Total</th>
              <th>Passed</th>
              <th>Failed</th>
              <th>Skipped</th>
            </tr>
          </thead>
          <tbody>
            {(product.suites ?? []).map((suite: ProductSuite) => (
              <tr key={suite.name}>
                <td>{suite.name}</td>
                <td>{suite.status}</td>
                <td>{suite.total}</td>
                <td>{suite.passed}</td>
                <td>{suite.failed}</td>
                <td>{suite.skipped}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ExecutionsPage() {
  const [items, setItems] = useState<Execution[]>([]);
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchProducts().then((payload) => {
      const selected = payload.products;
      const all: Execution[] = selected.flatMap((product: ProductSummary) => [
        { id: `${product.key}-latest`, productKey: product.key, date: product.lastExecutionAt, status: product.status, executed: product.executed, passed: product.passed, failed: product.failed, approval: product.approvalRate, duration: 1920000, source: 'Push main' },
        { id: `${product.key}-previous`, productKey: product.key, date: '2026-08-09T12:00:00.000Z', status: 'ACTIVE', executed: product.executed, passed: Math.max(product.passed - 1, 0), failed: product.failed + 1, approval: Math.max((product.approvalRate ?? 0) - 1, 0), duration: 2000000, source: 'Schedule' }
      ]);
      setItems(all);
    });
  }, []);

  const filtered = items.filter((entry) => {
    const productOK = filterProduct === 'all' || entry.productKey === filterProduct;
    const statusOK = filterStatus === 'all' || entry.status === filterStatus;
    return productOK && statusOK;
  });

  return (
    <section className="panel full-width">
      <div className="section-header">
        <h2>Executions</h2>
        <span>{filtered.length} entries</span>
      </div>

      <div className="toolbar">
        <label>
          Product
          <select value={filterProduct} onChange={(event) => setFilterProduct(event.target.value)}>
            <option value="all">All</option>
            <option value="shopsphere">ShopSphere</option>
            <option value="servicedesk">ServiceDesk</option>
            <option value="pocketwallet">PocketWallet</option>
          </select>
        </label>
        <label>
          Status
          <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
            <option value="all">All</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="STALE">STALE</option>
            <option value="ERROR">ERROR</option>
            <option value="NO_EXECUTION">NO_EXECUTION</option>
          </select>
        </label>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Date</th>
              <th>Status</th>
              <th>Executed</th>
              <th>Passed</th>
              <th>Failed</th>
              <th>Approval</th>
              <th>Duration</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.productKey}</td>
                <td>{formatDate(entry.date)}</td>
                <td>{entry.status}</td>
                <td>{entry.executed}</td>
                <td>{entry.passed}</td>
                <td>{entry.failed}</td>
                <td>{formatApproval(entry.approval)}</td>
                <td>{entry.duration / 1000}s</td>
                <td>{entry.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HowItWorksPage() {
  return (
    <section className="panel">
      <h2>How it works</h2>
      <div className="flow-list" aria-label="How it works flow">
        <span>Code change</span>
        <span>↓</span>
        <span>GitHub Actions</span>
        <span>↓</span>
        <span>Automated Tests</span>
        <span>↓</span>
        <span>Report</span>
        <span>↓</span>
        <span>Artifact</span>
        <span>↓</span>
        <span>QualityOps API</span>
        <span>↓</span>
        <span>Normalizer</span>
        <span>↓</span>
        <span>Persistence</span>
        <span>↓</span>
        <span>Dashboard</span>
      </div>
      <p className="footnote">GitHub Actions executes automated tests. QualityOps Hub consolidates, normalizes, stores and presents the execution history for engineering decisions.</p>
    </section>
  );
}

function ComingSoonPage({ title }: { title: string }) {
  return (<section className="panel"><h2>{title}</h2><p className="message-panel">Coming in next milestone</p></section>);
}

function App() {
  const menuItems = useMemo(() => [
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
  ], []);

  return (
    <BrowserRouter>
      <div className="app-shell">
        <aside className="sidebar" aria-label="Sidebar navigation">
          <div className="brand" aria-label="QualityOps Hub logo">
            <div className="brand-mark" aria-hidden="true">Q</div>
            <div>
              <strong>QualityOps</strong>
              <small>Hub</small>
            </div>
          </div>
          <nav>
            {menuItems.map((item) => (
              <Link key={item.to} className="nav-link" to={item.to}>{item.label}</Link>
            ))}
          </nav>
        </aside>

        <main className="main-panel">
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
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
