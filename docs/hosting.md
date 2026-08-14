# Hosted demo readiness

Status: technically prepared; provisioning and deployment are not authorized.

## Architecture decision

The hosted target is one Docker-based Render Web Service plus one external Neon PostgreSQL database. Fastify serves both the API and the compiled React/Vite assets from one origin. Render owns the application runtime; Neon is the selected persistent datastore for this portfolio demo.

One web service is the smallest operational shape that preserves the existing product: it provides one public URL, removes production CORS from the normal path, keeps Pipeline Lab's internal ingestion call same-origin, and avoids coordinating separate frontend and API releases. The web application uses relative `/api` requests in production. The container pins Node `20.20.1`, pnpm `10.34.5`, the frozen application dependencies, and the system/browser dependencies needed by real Cypress and Playwright runners.

The database contract remains standard PostgreSQL through `DATABASE_URL`. Application code does not call the Render API, Neon API, Supabase API, or a provider-specific database SDK, and no Neon project ID appears in source. The same OCI image can run with any compatible PostgreSQL provider.

## Deployment boundary

`render.yaml` is a dormant Web Service plan. It declares no Render database and does not provision anything by itself. `autoDeployTrigger: off` prevents a linked service from deploying on ordinary pushes. A human must review Render and Neon pricing/free-tier limits, create the two resources in a separately authorized step, enter pending values, and explicitly deploy.

The planned sequence is:

1. image build: use exact Node/pnpm, install with the frozen lockfile, install the Playwright Chromium headless shell plus its system dependencies, install/verify Cypress, then compile all workspaces;
2. start: `node scripts/start-production.mjs` in the container (the same lifecycle exposed locally as `pnpm start`) runs the ordered SQL migration deploy and idempotent demo bootstrap;
3. application: the same command starts compiled Fastify, which serves `apps/web/dist` and binds `HOST`/`PORT`.

The Docker runtime is required because Render's native Node image does not promise the browser binaries and Linux libraries needed by Pipeline Lab. The image runs browsers as the unprivileged `node` user. Render's pre-deploy command is not used in the free plan because it is a paid-service feature. The start wrapper gives the free plan the required build -> migrate/bootstrap -> application ordering. Migration and bootstrap are safe to repeat. A future paid service may move `pnpm migrate:deploy && pnpm bootstrap:demo` into a provider pre-deploy command without changing application semantics. Production never runs `prisma migrate dev` and no deploy path resets the database.

## Environment variables

| Variable | Required | Secret | Source |
|---|---:|---:|---|
| `NODE_ENV` | Yes | No | Blueprint, fixed to `production` |
| `DATABASE_URL` | Yes | Yes | Exact Neon PostgreSQL connection string, entered in Render only after Neon provisioning |
| `PUBLIC_APP_URL` | Yes | No | Exact Render HTTPS URL, entered after the Web Service receives its public URL |
| `API_BASE_URL` | No | No | Omit for same-origin; production defaults it to `PUBLIC_APP_URL` |
| `DEMO_PIPELINE_LAB_ENABLED` | Yes | No | Blueprint feature flag |
| `DEMO_SYSTEM_TOKEN` | Yes | Yes | New high-entropy secret generated only in Render during provisioning |
| `DEMO_MAX_CONCURRENT_RUNS` | Yes | No | Blueprint, `2` |
| `DEMO_RUN_TIMEOUT_MS` | Yes | No | Blueprint, `120000` |
| `DEMO_RUN_COOLDOWN_MS` | Yes | No | Blueprint, `10000` |
| `DEMO_RATE_LIMIT_MAX` | Yes | No | Blueprint, `4` |
| `DEMO_RATE_LIMIT_WINDOW_MS` | Yes | No | Blueprint, `60000` |
| `HOST` | No | No | Application default, `0.0.0.0` |
| `PORT` | Yes | No | Render runtime; never hardcoded by the application |
| `DATABASE_POOL_MAX` | No | No | Application default, conservative maximum of `8` connections for one instance |
| `DATABASE_SSL_MODE` | No | No | Normally omit so the provider connection string controls `sslmode` |
| `QUALITYOPS_ALLOWED_ORIGINS` | No | No | Leave unset for same-origin production |

No value for a real database or system token belongs in Git, a workflow, logs, screenshots, frontend assets, or Docker build arguments. The system credential is generated only as a Render secret during authorized provisioning and is used only by the server-side Pipeline Lab ingestion call. It is not an integration token, is not generated during build, stored in PostgreSQL, included in responses, or forwarded to child processes.

## Public URL bootstrap

The final `onrender.com` URL does not exist yet and no fictional value is versioned. The authorized provisioning procedure is:

1. create the Render Web Service with auto-deploy disabled;
2. record the exact HTTPS URL assigned by Render;
3. configure `PUBLIC_APP_URL` with that URL;
4. leave `API_BASE_URL` unset for the same-origin architecture (set it to the same exact URL only if an operational check proves it necessary);
5. configure the remaining required environment values and secrets;
6. trigger one manual deploy;
7. validate `/api/health`, `/api/readiness`, the UI, and Pipeline Lab.

The first deploy is not considered valid until the exact public URL is configured. After initial public homologation, `checksPass` may be evaluated as a separate change; commit-triggered auto-deploy remains disabled for the first release.

## Database, migrations and bootstrap

`DATABASE_URL` is mandatory in production. Use the exact Neon connection string supplied at provisioning, including its TLS parameters. The PostgreSQL driver reads `sslmode` from that URL; certificate verification remains enabled, global TLS verification is never disabled, and the Blueprint does not override Neon TLS with `disable`.

The planned single Render instance uses the direct PostgreSQL connection string and the existing small application pool (`DATABASE_POOL_MAX=8` by default). This milestone does not add PgBouncer or a Neon pooled hostname. A pooled connection can be evaluated only if observed connection pressure justifies its transaction-mode tradeoffs.

The project uses an ordered, transactional SQL migration runner equivalent to a production migration-deploy command. `pnpm migrate:deploy` creates `schema_migrations`, applies each unapplied file from `prisma/migrations`, and never runs a development migration command.

`pnpm bootstrap:demo` upserts exactly the three fictional products and adds the minimum synthetic history only when a product has no execution. It is idempotent, does not truncate tables, does not delete visitor executions, and does not create or rotate ingestion tokens. This is separate from `pnpm demo:reset`, which remains a guarded local-only operator command and has no HTTP route.

PostgreSQL is the source of truth for products, executions, suites, cases, pipeline metadata, deltas, demo job state, and token hashes. On a new database, bootstrap creates the three fictional products and their minimum demo history. A second startup safely reruns migrations and bootstrap without duplicating products, deleting public executions, recreating tokens, or resetting history. Incomplete jobs from an interrupted instance restart are marked failed with a sanitized explanation.

Neon can suspend idle compute and reactivate it on demand, so the first database operation after inactivity may have additional latency. The application keeps connection counts conservative and does not send artificial keep-alive traffic to defeat autosuspend.

## Pipeline Lab security

The public request contract is a strict object containing only an allow-listed product, suite, and mode. Products are ShopSphere, ServiceDesk, and PocketWallet; suites are Smoke and Regression; modes are Success, Functional Failure, and Infrastructure Failure. Extra fields and unsupported enum values are rejected. A visitor cannot supply a command, script, path, URL, shell argument, or environment value.

The server maps those enums to fixed runner files and arguments, resolves the artifact directory under a server-generated UUID, fixes the working directory, and spawns with `shell: false`. Child processes receive a small operating-system environment allowlist plus `DEMO_TARGET_URL`; database and credential variables do not cross the process boundary.

Abuse controls are deliberately small for a portfolio demo:

- per-client request window and cooldown, returning HTTP 429 with `Retry-After`;
- two active jobs by default, returning `Demo capacity reached. Try again shortly.` when full;
- 4 KiB request limit on the public run endpoint;
- 120-second runner timeout by default;
- process-tree termination on timeout and persistence as a sanitized `ERROR` execution with `executed=0`;
- bounded console capture and no raw report logging.

The in-memory limiter is suitable for the planned single instance. Horizontal scaling would require a shared limiter/queue and is intentionally not enabled.

## Health, readiness, errors and logs

- `GET /api/health` proves the process is alive.
- `GET /api/readiness` checks PostgreSQL and reports whether demo jobs are enabled.

Neither endpoint returns connection strings, credentials, internal hosts, or stacks. Production errors use generic responses plus a request ID. Structured logs include request ID, route, status, duration and, where applicable, run ID and product. Authorization is redacted; cookies, tokens, full report bodies, and database URLs are not logged.

Responses add CSP, `X-Content-Type-Options`, `X-Frame-Options`, referrer, and permissions policies. Production is same-origin and does not register CORS unless an explicit allowlist is configured.

## Ephemeral filesystem

Raw runner reports, normalized snapshots, metadata files, logs, screenshots, and videos under `artifacts/` are disposable. Render may discard them on restart, redeploy, or idle spin-down. The dashboard and execution details read normalized PostgreSQL rows, not the artifact files, and remain functional after those files disappear. Existing ingestion/integration and production-like tests prove that execution details are reconstructed from persisted database rows. Object storage is not required for the first hosted demo. A future milestone may store raw reports, video evidence, and large artifacts in S3-compatible storage.

## Production verification

After `pnpm build`, `pnpm test:production` uses compiled Fastify/React rather than the Vite development server. It verifies ShopSphere success and functional failure, ServiceDesk success, PocketWallet infrastructure failure, persistence, dashboard updates, Regression Delta, navigation, health/readiness, cooldown, and concurrent capacity. The release plan additionally builds the Dockerfile and smoke-tests that exact container before provisioning.

An empty-database rehearsal must create a dedicated disposable PostgreSQL database, run migrations/bootstrap/start, record row counts, run the production smoke, then repeat startup. The second snapshot must retain visitor runs, keep three products, avoid seeded-history duplicates, and show no automatically generated tokens.

## Rollback and data protection

Rollback means selecting the previous known-good application deploy while keeping migrations backward-compatible with that version. Destructive or incompatible migrations require a separately reviewed expand/migrate/contract plan; they must not be coupled to a routine rollback.

Neon PostgreSQL is the selected persistent datastore for the demo; Render's filesystem is not persistence. This is still a **Portfolio Preview**, not declared production infrastructure or an SLA-backed service. Free-plan quotas, restore windows, autosuspend behavior, and pricing must be reviewed again during provisioning. Moving to any paid plan or adding a backup-bearing service requires separate cost approval. No application-level backup system is implemented in this checkpoint.

## Known limitations

- one in-process worker and one instance; no distributed queue or limiter;
- ephemeral raw artifacts and browser evidence;
- synthetic products and executions only; PocketWallet is `MOBILE_HARNESS_DEMO`, not a device run;
- no accounts, visitor PII, analytics, tracking, autoscaling, or custom domain;
- the free Render Web Service can spin down after inactivity, and Neon compute can autosuspend; the next request may have a short cold start;
- no keep-alive cron, synthetic ping, or other mechanism attempts to bypass free-tier sleep;
- Neon free-plan storage, compute, transfer, and restore limits apply and may change before provisioning;
- provider provisioning, secret entry, deployment, and billing review remain human actions.

## Provider references

- [Render Blueprint YAML reference](https://render.com/docs/blueprint-spec)
- [Render deploy lifecycle](https://render.com/docs/deploys)
- [Render Web Service port binding](https://render.com/docs/web-services#port-binding)
- [Render health checks](https://render.com/docs/health-checks)
- [Render free-tier limitations](https://render.com/docs/free)
- [Neon connection guidance](https://neon.com/docs/connect/connection-errors)
- [Neon compute lifecycle and scale to zero](https://neon.com/docs/manage/endpoints)
- [Neon connection pooling](https://neon.com/docs/connect/connection-pooling)
- [Neon plans and current limits](https://neon.com/pricing)
- [Playwright browser installation](https://playwright.dev/docs/browsers)
- [Cypress Linux prerequisites](https://docs.cypress.io/app/get-started/install-cypress)
