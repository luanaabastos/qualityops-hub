import { useEffect, useMemo, useState } from 'react';
import { demoAutomationCoverage, demoAutomationCoverageSummary } from '@qualityops-hub/shared';
import { fetchProducts } from './api';
import type { ProductSummary } from './types';

function pageStatusClass(value: string) {
  return value.toLowerCase().replaceAll('_', '-');
}

function portfolioDate(value: string | null) {
  if (!value) return 'No ingestion yet';
  return new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function PortfolioPageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <header className="topbar" aria-label="Page header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      <div className="header-badges"><span className="demo-badge">DEMO DATA</span></div>
    </header>
  );
}

export function CoveragePage() {
  return (
    <>
      <PortfolioPageHeader
        eyebrow="Test plan visibility"
        title="Automation Coverage"
        description="A transparent demo model of how much of the eligible test plan is automated."
      />
      <section className="coverage-summary" aria-label="Automation coverage summary">
        <article className="coverage-hero">
          <span>Overall coverage</span>
          <strong>{demoAutomationCoverageSummary.percentage}%</strong>
          <div
            className="coverage-track"
            role="progressbar"
            aria-label="Overall automation coverage"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={demoAutomationCoverageSummary.percentage}
          >
            <span style={{ width: `${demoAutomationCoverageSummary.percentage}%` }} />
          </div>
          <small>{demoAutomationCoverageSummary.automated} of {demoAutomationCoverageSummary.eligible} eligible scenarios</small>
        </article>
        <div className="coverage-totals">
          <article><span>Eligible</span><strong>{demoAutomationCoverageSummary.eligible}</strong><small>Scenarios suitable for automation</small></article>
          <article><span>Automated</span><strong>{demoAutomationCoverageSummary.automated}</strong><small>Mapped to an automated identity</small></article>
          <article><span>Remaining</span><strong>{demoAutomationCoverageSummary.remaining}</strong><small>Eligible scenarios not automated yet</small></article>
        </div>
      </section>
      <section className="panel" aria-labelledby="coverage-products-title">
        <div className="section-header">
          <h2 id="coverage-products-title">Product breakdown</h2>
          <span>Fictional planning baseline</span>
        </div>
        <div className="coverage-grid">
          {demoAutomationCoverage.map((product) => {
            const remaining = product.eligible - product.automated;
            const percentage = Number(((product.automated / product.eligible) * 100).toFixed(1));
            return (
              <article className="coverage-card" key={product.productKey}>
                <header><h3>{product.productName}</h3><strong>{percentage}%</strong></header>
                <div className="coverage-track" role="progressbar" aria-label={`${product.productName} automation coverage`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
                  <span style={{ width: `${percentage}%` }} />
                </div>
                <dl>
                  <div><dt>Eligible</dt><dd>{product.eligible}</dd></div>
                  <div><dt>Automated</dt><dd>{product.automated}</dd></div>
                  <div><dt>Remaining</dt><dd>{remaining}</dd></div>
                </dl>
              </article>
            );
          })}
        </div>
      </section>
      <aside className="notice info-notice" aria-label="Coverage definition">
        <strong>Coverage is not approval.</strong> Automation coverage measures how much of the eligible test plan is automated. It is independent from execution approval.
      </aside>
    </>
  );
}

type PlanStatus = 'AUTOMATED' | 'PLANNED' | 'MANUAL' | 'NOT_ELIGIBLE';
type Priority = 'P0' | 'P1' | 'P2' | 'P3';
type PlanEntry = {
  id: string;
  product: 'shopsphere' | 'servicedesk' | 'pocketwallet';
  productName: string;
  scenario: string;
  priority: Priority;
  status: PlanStatus;
  framework: string;
  identity: string;
};

const automationPlan: PlanEntry[] = [
  { id: 'SS-001', product: 'shopsphere', productName: 'ShopSphere', scenario: 'Customer signs in', priority: 'P0', status: 'AUTOMATED', framework: 'Cypress', identity: 'shopsphere.cy.ts › signs in' },
  { id: 'SS-002', product: 'shopsphere', productName: 'ShopSphere', scenario: 'Item is added to the cart', priority: 'P0', status: 'AUTOMATED', framework: 'Cypress', identity: 'shopsphere.cy.ts › adds an item to the cart' },
  { id: 'SS-003', product: 'shopsphere', productName: 'ShopSphere', scenario: 'Promotion stacking rules', priority: 'P1', status: 'PLANNED', framework: 'Cypress', identity: 'Not assigned' },
  { id: 'SS-004', product: 'shopsphere', productName: 'ShopSphere', scenario: 'Visual merchandising review', priority: 'P2', status: 'MANUAL', framework: 'Manual', identity: 'Not assigned' },
  { id: 'SD-001', product: 'servicedesk', productName: 'ServiceDesk', scenario: 'Agent opens a ticket', priority: 'P0', status: 'AUTOMATED', framework: 'Playwright', identity: 'servicedesk.spec.ts › opens a ticket' },
  { id: 'SD-002', product: 'servicedesk', productName: 'ServiceDesk', scenario: 'Agent changes priority', priority: 'P1', status: 'AUTOMATED', framework: 'Playwright', identity: 'servicedesk.spec.ts › changes ticket priority' },
  { id: 'SD-003', product: 'servicedesk', productName: 'ServiceDesk', scenario: 'Bulk ticket assignment', priority: 'P1', status: 'PLANNED', framework: 'Playwright', identity: 'Not assigned' },
  { id: 'SD-004', product: 'servicedesk', productName: 'ServiceDesk', scenario: 'Free-form response quality', priority: 'P3', status: 'NOT_ELIGIBLE', framework: 'Not applicable', identity: 'Not eligible' },
  { id: 'PW-001', product: 'pocketwallet', productName: 'PocketWallet', scenario: 'Wallet balance is displayed', priority: 'P0', status: 'AUTOMATED', framework: 'MOBILE_HARNESS_DEMO', identity: 'harness.mjs › balance' },
  { id: 'PW-002', product: 'pocketwallet', productName: 'PocketWallet', scenario: 'Transfer receipt is created', priority: 'P0', status: 'AUTOMATED', framework: 'MOBILE_HARNESS_DEMO', identity: 'harness.mjs › receipt' },
  { id: 'PW-003', product: 'pocketwallet', productName: 'PocketWallet', scenario: 'Offline transfer recovery', priority: 'P1', status: 'MANUAL', framework: 'Manual', identity: 'Not assigned' },
  { id: 'PW-004', product: 'pocketwallet', productName: 'PocketWallet', scenario: 'Biometric hardware response', priority: 'P2', status: 'NOT_ELIGIBLE', framework: 'Not applicable', identity: 'Not eligible in this harness' }
];

export function AutomationPlanPage() {
  const [product, setProduct] = useState('all');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const filtered = useMemo(() => automationPlan.filter((entry) => (
    (product === 'all' || entry.product === product)
    && (status === 'all' || entry.status === status)
    && (priority === 'all' || entry.priority === priority)
  )), [priority, product, status]);

  return (
    <>
      <PortfolioPageHeader
        eyebrow="Automation portfolio"
        title="Automation Plan"
        description="A representative, fictional scenario catalog connected to the Coverage demo."
      />
      <section className="panel full-width" aria-labelledby="automation-catalog-title">
        <div className="section-header">
          <div><h2 id="automation-catalog-title">Scenario catalog</h2><p className="section-copy">Representative rows from a 40-scenario eligible plan; filters update this view without changing the source data.</p></div>
          <button className="secondary-button" type="button" disabled title="Planned for a later milestone">Import CSV/XLSX — planned</button>
        </div>
        <div className="toolbar" aria-label="Automation plan filters">
          <label>Product<select value={product} onChange={(event) => setProduct(event.target.value)}><option value="all">All products</option><option value="shopsphere">ShopSphere</option><option value="servicedesk">ServiceDesk</option><option value="pocketwallet">PocketWallet</option></select></label>
          <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="AUTOMATED">Automated</option><option value="PLANNED">Planned</option><option value="MANUAL">Manual</option><option value="NOT_ELIGIBLE">Not eligible</option></select></label>
          <label>Priority<select value={priority} onChange={(event) => setPriority(event.target.value)}><option value="all">All priorities</option><option value="P0">P0</option><option value="P1">P1</option><option value="P2">P2</option><option value="P3">P3</option></select></label>
        </div>
        <p className="result-count" aria-live="polite">Showing {filtered.length} of {automationPlan.length} representative scenarios.</p>
        {filtered.length === 0 ? <div className="message-panel" role="status">No scenarios match the selected filters.</div> : (
          <div className="table-wrap" tabIndex={0} aria-label="Scrollable automation plan table">
            <table className="plan-table">
              <caption className="sr-only">Fictional automation plan</caption>
              <thead><tr><th>Scenario ID</th><th>Product</th><th>Scenario</th><th>Priority</th><th>Automation status</th><th>Framework</th><th>Automated test identity</th></tr></thead>
              <tbody>{filtered.map((entry) => <tr key={entry.id}>
                <td><code>{entry.id}</code></td><td>{entry.productName}</td><td>{entry.scenario}</td><td>{entry.priority}</td>
                <td><span className={`pill ${pageStatusClass(entry.status)}`}>{entry.status.replaceAll('_', ' ')}</span></td><td>{entry.framework}</td><td>{entry.identity}</td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

const integrationDefinitions = {
  shopsphere: { framework: 'Cypress', report: 'Mochawesome', mode: 'Browser runner' },
  servicedesk: { framework: 'Playwright', report: 'playwright-json-v1', mode: 'Browser runner' },
  pocketwallet: { framework: 'MOBILE_HARNESS_DEMO', report: 'mobile-e2e-json-v1', mode: 'Mobile Harness Demo' }
} as const;

export function IntegrationsPage() {
  const [products, setProducts] = useState<ProductSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetchProducts().then((payload) => { setProducts(payload.products); setFailed(false); }).catch(() => setFailed(true));
  }, []);

  return (
    <>
      <PortfolioPageHeader eyebrow="Report connections" title="Integrations" description="Known product adapters and their latest persisted ingestion state." />
      {failed ? <div className="message-panel error-message" role="alert">Integration status is unavailable because the API could not be reached.</div> : null}
      {!failed && products === null ? <div className="message-panel" role="status">Loading integration status…</div> : null}
      {products ? <section className="integration-grid" aria-label="Product integrations">
        {products.map((product) => {
          const definition = integrationDefinitions[product.key as keyof typeof integrationDefinitions];
          if (!definition) return null;
          return <article className="integration-card" key={product.key}>
            <header><div><p className="eyebrow">{definition.mode}</p><h2>{product.name}</h2></div><span className={`pill ${pageStatusClass(product.executionStatus)}`}>{product.executionStatus.replaceAll('_', ' ')}</span></header>
            <dl>
              <div><dt>Framework</dt><dd>{definition.framework}</dd></div>
              <div><dt>Report</dt><dd>{definition.report}</dd></div>
              <div><dt>Adapter</dt><dd><span className="pill ready">Ready</span></dd></div>
              <div><dt>Authentication</dt><dd>Product token</dd></div>
              <div><dt>Origin</dt><dd>{product.isOfficial ? 'GitHub Actions' : product.origin === 'SEEDED_DEMO' ? 'Seeded demo history' : product.origin ? 'Local demo run' : 'No execution'}</dd></div>
              <div><dt>Last ingestion</dt><dd>{portfolioDate(product.lastExecutionAt)}</dd></div>
              <div><dt>Status</dt><dd>{product.status}</dd></div>
            </dl>
          </article>;
        })}
      </section> : null}
      <section className="panel" aria-labelledby="integration-flow-title">
        <div className="section-header"><h2 id="integration-flow-title">Ingestion architecture</h2><span>No tokens are displayed</span></div>
        <ol className="compact-flow" aria-label="Integration processing flow">
          {['Report', 'Authenticated ingestion', 'Versioned adapter', 'Normalized execution', 'PostgreSQL'].map((step, index) => <li key={step}><span>{index + 1}</span><strong>{step}</strong></li>)}
        </ol>
      </section>
    </>
  );
}

const videoPreviews = [
  { title: 'Checkout regression replay', product: 'ShopSphere', scenario: 'Add item to cart', description: 'Preview of evidence associated with a deterministic functional failure.', duration: '00:42', status: 'REVIEW_READY' },
  { title: 'Ticket lifecycle walkthrough', product: 'ServiceDesk', scenario: 'Resolve ticket', description: 'Preview of a successful browser scenario attached to a persisted run.', duration: '00:31', status: 'APPROVED' },
  { title: 'Harness startup interruption', product: 'PocketWallet', scenario: 'Runner initialization', description: 'Concept preview for a zero-execution infrastructure incident.', duration: '00:18', status: 'TRIAGE' }
];

function VideoPlaceholder({ product }: { product: string }) {
  return (
    <svg className="video-placeholder" viewBox="0 0 640 320" role="img" aria-label={`Original placeholder thumbnail for ${product}`}>
      <defs><linearGradient id={`video-gradient-${product}`} x1="0" x2="1"><stop stopColor="#173454" /><stop offset="1" stopColor="#12243a" /></linearGradient></defs>
      <rect width="640" height="320" rx="28" fill={`url(#video-gradient-${product})`} />
      <circle cx="320" cy="154" r="54" fill="#5eead4" opacity="0.92" />
      <path d="M305 124 305 184 350 154Z" fill="#06121f" />
      <text x="32" y="286" fill="#d9e7f5" fontSize="24" fontFamily="system-ui">{product} · DEMO PREVIEW</text>
    </svg>
  );
}

export function VideoEvidencePage() {
  return (
    <>
      <PortfolioPageHeader eyebrow="Evidence concept" title="Video Evidence" description="Associate execution recordings with test scenarios and runs." />
      <div className="preview-banner"><strong>DEMO PREVIEW</strong><span>Concept data only; no recording files are stored or streamed.</span></div>
      <section className="video-grid" aria-label="Video evidence previews">
        {videoPreviews.map((preview) => <article className="video-card" key={preview.title}>
          <VideoPlaceholder product={preview.product} />
          <div className="video-content"><div className="section-header"><div><p className="eyebrow">DEMO PREVIEW</p><h2>{preview.title}</h2></div><span className={`pill ${pageStatusClass(preview.status)}`}>{preview.status.replaceAll('_', ' ')}</span></div>
            <p>{preview.description}</p><dl><div><dt>Product</dt><dd>{preview.product}</dd></div><div><dt>Scenario</dt><dd>{preview.scenario}</dd></div><div><dt>Duration</dt><dd>{preview.duration}</dd></div></dl>
          </div>
        </article>)}
      </section>
      <aside className="notice info-notice"><strong>Planned persistence:</strong> File upload and persistent object storage are planned for a later milestone.</aside>
    </>
  );
}

const documents = [
  { id: 'shopsphere-automation', title: 'ShopSphere automation', purpose: 'Demonstrate a browser-based commerce regression flow.', framework: 'Cypress', execution: 'Pipeline Lab starts an allow-listed Cypress process against the bundled synthetic target.', report: 'Mochawesome JSON.', pipeline: 'The report crosses the authenticated ingestion boundary and is normalized before persistence.', troubleshooting: 'Confirm the demo target, Cypress binary, API readiness, and runner artifact directory.' },
  { id: 'servicedesk-automation', title: 'ServiceDesk automation', purpose: 'Demonstrate a support workflow through a second browser framework.', framework: 'Playwright', execution: 'Pipeline Lab runs the fixed ServiceDesk spec against the bundled synthetic target.', report: 'playwright-json-v1.', pipeline: 'The adapter maps Playwright cases to the same normalized model used by other products.', troubleshooting: 'Check Chromium availability, target readiness, and the generated JSON report.' },
  { id: 'pocketwallet-harness', title: 'PocketWallet mobile harness', purpose: 'Explain mobile result normalization and pre-execution infrastructure errors.', framework: 'MOBILE_HARNESS_DEMO', execution: 'A deterministic Node harness emits synthetic mobile-shaped results; it never claims a device run.', report: 'mobile-e2e-json-v1.', pipeline: 'Success, functional failure, and zero-execution infrastructure evidence use the same ingestion API.', troubleshooting: 'Inspect harness metadata and keep Android, Appium, and device claims out of this preview.' },
  { id: 'report-adapters', title: 'Report adapters', purpose: 'Keep framework parsing separate from domain-level quality semantics.', framework: 'Versioned adapter registry', execution: 'The declared report format selects one strict parser.', report: 'Mochawesome, playwright-json-v1, or mobile-e2e-json-v1.', pipeline: 'Adapters validate, sanitize, normalize, and return a common execution contract.', troubleshooting: 'Verify the reportFormat discriminator and schema validation response.' },
  { id: 'pipeline-lab', title: 'Pipeline Lab', purpose: 'Provide an interactive portfolio demonstration without arbitrary execution.', framework: 'Allow-listed local runners', execution: 'Visitors choose enums only; the server maps them to fixed files and bounded processes.', report: 'The selected runner emits its registered format.', pipeline: 'Queue, run, process, ingest, persist, and open the normalized result.', troubleshooting: 'Rate limits, cooldown, capacity, and runner timeout are reported as explicit states.' },
  { id: 'architecture', title: 'Architecture', purpose: 'Connect CI evidence to historical quality decisions.', framework: 'React, Fastify, PostgreSQL', execution: 'External or demo runners submit structured reports to one HTTP boundary.', report: 'Validated source reports plus normalized execution history.', pipeline: 'Report → authentication → adapter → normalization → PostgreSQL → dashboard.', troubleshooting: 'Start with Platform Health, then inspect API logs and database connectivity.' }
];

export function DocumentationPage() {
  return (
    <>
      <PortfolioPageHeader eyebrow="Product guide" title="Documentation" description="Concise operating guides for the public portfolio experience." />
      <nav className="docs-navigation" aria-label="Documentation topics">
        {documents.map((document) => <a href={`#${document.id}`} key={document.id}>{document.title}</a>)}
      </nav>
      <section className="docs-grid" aria-label="Documentation content">
        {documents.map((document) => <article className="doc-card" id={document.id} key={document.id}>
          <p className="eyebrow">Guide</p><h2>{document.title}</h2>
          <dl>
            <div><dt>Purpose</dt><dd>{document.purpose}</dd></div>
            <div><dt>Framework</dt><dd>{document.framework}</dd></div>
            <div><dt>How execution works</dt><dd>{document.execution}</dd></div>
            <div><dt>Report format</dt><dd>{document.report}</dd></div>
            <div><dt>Pipeline behavior</dt><dd>{document.pipeline}</dd></div>
            <div><dt>Troubleshooting</dt><dd>{document.troubleshooting}</dd></div>
          </dl>
        </article>)}
      </section>
    </>
  );
}
