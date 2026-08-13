# Hosted demo readiness

Status: technically prepared; provisioning and deployment are not authorized.

## Architecture decision

The hosted target is one Docker-based Render web service plus one managed PostgreSQL database. Fastify serves both the API and the compiled React/Vite assets from one origin. This is option B from the hosting review.

One service is the smallest operational shape that preserves the existing product: it provides one public URL, removes production CORS from the normal path, keeps Pipeline Lab's internal ingestion call same-origin, and avoids coordinating separate frontend and API releases. The web application still uses relative `/api` requests in production. The container pins Node `20.20.1`, pnpm `10.34.5`, the frozen application dependencies, and the system/browser dependencies needed by real Cypress and Playwright runners. Railway remains a future alternative because the runtime contract is a standard OCI container, environment variables, and PostgreSQL; no application code calls a Render API.

## Deployment boundary

`render.yaml` is a dormant plan. It does not provision anything by itself. `autoDeployTrigger: off` prevents a linked service from deploying on ordinary pushes. A human must review provider pricing and free-tier availability, create or sync the Blueprint, enter pending values, and explicitly deploy.

The planned sequence is:

1. image build: use exact Node/pnpm, install with the frozen lockfile, install the Playwright Chromium headless shell plus its system dependencies, install/verify Cypress, then compile all workspaces;
2. start: `node scripts/start-production.mjs` in the container (the same lifecycle exposed locally as `pnpm start`) runs the ordered SQL migration deploy and idempotent demo bootstrap;
3. application: the same command starts compiled Fastify, which serves `apps/web/dist` and binds `HOST`/`PORT`.

The Docker runtime is required because Render's native Node image does not promise the browser binaries and Linux libraries needed by Pipeline Lab. The image runs browsers as the unprivileged `node` user. Render's pre-deploy command is not used in the free plan because it is a paid-service feature. The start wrapper gives the free plan the required build -> migrate/bootstrap -> application ordering. Migration and bootstrap are safe to repeat. A future paid service may move `pnpm migrate:deploy && pnpm bootstrap:demo` into a provider pre-deploy command without changing application semantics.

## Environment variables

| Variable | Secret | Source |
|---|---:|---|
| `NODE_VERSION` | No | Blueprint documentation; Docker base is exact `20.20.1` |
| `NODE_ENV` | No | Blueprint/provider, `production` |
| `HOST` | No | Optional provider value; default `0.0.0.0` |
| `PORT` | No | Provider runtime |
| `DATABASE_URL` | Yes | Managed PostgreSQL `connectionString` reference |
| `DATABASE_SSL_MODE` | No | `disable` for same-region private URL; `require` when TLS is required |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | No | Default `true`; never disable without an explicit certificate reason |
| `PUBLIC_APP_URL` | No | Exact final HTTPS URL entered at provisioning |
| `API_BASE_URL` | No | Optional; defaults to `PUBLIC_APP_URL` in production |
| `DEMO_PIPELINE_LAB_ENABLED` | No | Blueprint feature flag |
| `DEMO_SYSTEM_TOKEN` | Yes | New high-entropy provider secret entered at provisioning |
| `DEMO_MAX_CONCURRENT_RUNS` | No | Blueprint, default `2` |
| `DEMO_RATE_LIMIT_MAX` | No | Blueprint, default `4` |
| `DEMO_RATE_LIMIT_WINDOW_MS` | No | Blueprint, default `60000` |
| `DEMO_RUN_COOLDOWN_MS` | No | Blueprint, default `10000` |
| `DEMO_RUN_TIMEOUT_MS` | No | Blueprint, default `120000` |
| `QUALITYOPS_ALLOWED_ORIGINS` | No | Leave unset for same-origin production |

No value for a real database or system token belongs in Git, a workflow, logs, screenshots, or frontend assets. The system credential is only used by the server-side Pipeline Lab ingestion call. It is not generated during build, stored in PostgreSQL, included in responses, or forwarded to child processes.

## Database, migrations and bootstrap

`DATABASE_URL` is mandatory in production. The PostgreSQL driver supports provider-required TLS via `DATABASE_SSL_MODE=require`; certificate verification remains enabled by default. The planned same-region Render service uses the database's private `connectionString`, so the Blueprint selects `disable` for that private connection and blocks all public database ingress.

The project uses an ordered, transactional SQL migration runner equivalent to a production migration-deploy command. `pnpm migrate:deploy` creates `schema_migrations`, applies each unapplied file from `prisma/migrations`, and never runs a development migration command.

`pnpm bootstrap:demo` upserts exactly the three fictional products and adds the minimum synthetic history only when a product has no execution. It is idempotent, does not truncate tables, does not delete visitor executions, and does not create or rotate ingestion tokens. This is separate from `pnpm demo:reset`, which remains a guarded local-only operator command and has no HTTP route.

PostgreSQL is the source of truth for products, executions, suites, cases, pipeline metadata, deltas, demo job state, and token hashes. A second startup can safely rerun migrations and bootstrap. Incomplete jobs from an interrupted instance restart are marked failed with a sanitized explanation.

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

Raw runner reports, normalized snapshots, metadata files, logs, screenshots, and videos under `artifacts/` are disposable. The dashboard and execution details read normalized PostgreSQL rows and remain functional after local artifacts disappear. Object storage is not required for the first hosted demo. A future milestone may store raw reports, video evidence, and large artifacts in S3-compatible storage.

## Production verification

After `pnpm build`, `pnpm test:production` uses compiled Fastify/React rather than the Vite development server. It verifies ShopSphere success and functional failure, ServiceDesk success, PocketWallet infrastructure failure, persistence, dashboard updates, Regression Delta, navigation, health/readiness, cooldown, and concurrent capacity. The release plan additionally builds the Dockerfile and smoke-tests that exact container before provisioning.

An empty-database rehearsal must create a dedicated disposable PostgreSQL database, run migrations/bootstrap/start, record row counts, run the production smoke, then repeat startup. The second snapshot must retain visitor runs, keep three products, avoid seeded-history duplicates, and show no automatically generated tokens.

## Rollback and data protection

Rollback means selecting the previous known-good application deploy while keeping migrations backward-compatible with that version. Destructive or incompatible migrations require a separately reviewed expand/migrate/contract plan; they must not be coupled to a routine rollback.

Managed PostgreSQL is the persistent source. Provider-managed backups should be enabled before treating the demo as durable. Render's current free PostgreSQL offering expires after 30 days and has no backups, so it is evaluation-only. Moving to a paid database or any backup-bearing plan requires separate cost approval. No application-level backup system is implemented in this checkpoint.

## Known limitations

- one in-process worker and one instance; no distributed queue or limiter;
- ephemeral raw artifacts and browser evidence;
- synthetic products and executions only; PocketWallet is `MOBILE_HARNESS_DEMO`, not a device run;
- no accounts, visitor PII, analytics, tracking, autoscaling, or custom domain;
- free services can sleep and the free database is temporary and unbacked;
- provider provisioning, secret entry, deployment, and billing review remain human actions.

## Provider references

- [Render Blueprint YAML reference](https://render.com/docs/blueprint-spec)
- [Render deploy lifecycle](https://render.com/docs/deploys)
- [Render Node version selection](https://render.com/docs/node-version)
- [Render PostgreSQL connectivity](https://render.com/docs/postgresql-creating-connecting)
- [Render free-tier limitations](https://render.com/docs/free)
- [Playwright browser installation](https://playwright.dev/docs/browsers)
- [Cypress Linux prerequisites](https://docs.cypress.io/app/get-started/install-cypress)
