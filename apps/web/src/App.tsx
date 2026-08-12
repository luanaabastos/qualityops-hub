import { demoProducts, qualitySummary } from '@qualityops-hub/shared';

const products = demoProducts;

function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Sidebar navigation">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">Q</div>
          <div>
            <strong>QualityOps</strong>
            <small>Hub</small>
          </div>
        </div>

        <nav>
          <a href="#overview" className="nav-link active">Overview</a>
          <a href="#products" className="nav-link">Products</a>
          <a href="#history" className="nav-link">History</a>
          <a href="#coverage" className="nav-link">Coverage</a>
          <a href="#security" className="nav-link">Security</a>
        </nav>
      </aside>

      <main className="main-panel">
        <header className="topbar" aria-label="Page header">
          <div>
            <p className="eyebrow">Platform overview</p>
            <h1>QualityOps Hub</h1>
          </div>
          <span className="demo-badge">DEMO DATA</span>
        </header>

        <section className="stats-grid" aria-label="Quality summary">
          <article className="stat-card accent">
            <span>Quality Score</span>
            <strong>{qualitySummary.qualityScore.toFixed(1)}%</strong>
            <small>Weighted across all executions</small>
          </article>
          <article className="stat-card">
            <span>Approval Rate</span>
            <strong>{qualitySummary.approvalRate.toFixed(1)}%</strong>
            <small>Passed / executed</small>
          </article>
          <article className="stat-card">
            <span>Tests Executed</span>
            <strong>{qualitySummary.testsExecuted}</strong>
            <small>Across all products</small>
          </article>
          <article className="stat-card">
            <span>Passed</span>
            <strong>{qualitySummary.passed}</strong>
            <small>Successful runs</small>
          </article>
          <article className="stat-card">
            <span>Failed</span>
            <strong>{qualitySummary.failed}</strong>
            <small>Functional failures</small>
          </article>
          <article className="stat-card">
            <span>Infrastructure Errors</span>
            <strong>{qualitySummary.infrastructureErrors}</strong>
            <small>Non-functional failures</small>
          </article>
        </section>

        <section id="products" className="panel">
          <div className="section-header">
            <h2>Products</h2>
            <span>{products.length} products monitored</span>
          </div>

          <div className="product-grid">
            {products.map((product) => (
              <article key={product.id} className="product-card">
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
                    <dd>{product.summary.approvalRate.toFixed(1)}%</dd>
                  </div>
                  <div>
                    <dt>Executed</dt>
                    <dd>{product.summary.executed}</dd>
                  </div>
                  <div>
                    <dt>Passed</dt>
                    <dd>{product.summary.passed}</dd>
                  </div>
                  <div>
                    <dt>Failed</dt>
                    <dd>{product.summary.failed}</dd>
                  </div>
                  <div>
                    <dt>Infra errors</dt>
                    <dd>{product.summary.infrastructureErrors}</dd>
                  </div>
                  <div>
                    <dt>Branch</dt>
                    <dd>{product.branch}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        <section className="two-column">
          <article id="history" className="panel muted-panel">
            <div className="section-header">
              <h2>Regression history</h2>
              <span>Last 30 days</span>
            </div>
            <ul className="timeline">
              <li><strong>ShopSphere</strong><span>New fail: 3 | Recovered: 4</span></li>
              <li><strong>ServiceDesk</strong><span>Stale execution detected</span></li>
              <li><strong>PocketWallet</strong><span>Infra error recovered</span></li>
            </ul>
          </article>

          <article id="coverage" className="panel muted-panel">
            <div className="section-header">
              <h2>Coverage & governance</h2>
              <span>Scenario mapping</span>
            </div>
            <div className="coverage-row">
              <div>
                <span>Automation Coverage</span>
                <strong>70%</strong>
              </div>
              <div>
                <span>Execution Approval</span>
                <strong>94.3%</strong>
              </div>
            </div>
            <p className="footnote">Coverage and approval are distinct metrics and should not be averaged together.</p>
          </article>
        </section>
      </main>
    </div>
  );
}

export default App;
