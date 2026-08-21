# LinkedIn post — English

Automation results often end up fragmented across pipelines, framework-specific reports, artifacts, logs, and historical runs. The challenge is not only knowing whether a job finished; it is turning those pieces into comparable, traceable evidence.

I built **QualityOps Hub**, an open-source portfolio project that normalizes test reports and presents quality signals in one experience.

The architecture separates execution from analysis:

- GitHub Actions runs real browsers with Cypress and Playwright;
- Mochawesome and Playwright JSON reports are retained as artifacts;
- an authenticated Fastify API receives each report;
- versioned adapters convert different formats into a common model;
- Neon PostgreSQL persists the history;
- a React application on Render presents metrics, details, and Regression Delta.

One important decision was not to run browsers on Render Free. The hosted environment serves the application and API, while external CI executes the tests. The public Pipeline Lab demonstrates the flow without creating official evidence.

The public proof includes three real workflows: a successful ShopSphere run, a successful ServiceDesk run, and an intentional ShopSphere functional failure. The resulting official dashboard shows 10 tests executed, 9 passed, 1 failed, and a 90% approval rate.

Every product and data point is fictional and synthetic.

Live demo: https://qualityops-hub.onrender.com<br>
Code and evidence: https://github.com/luanaabastos/qualityops-hub

#QualityEngineering #TestAutomation #Playwright #Cypress #TypeScript #GitHubActions
