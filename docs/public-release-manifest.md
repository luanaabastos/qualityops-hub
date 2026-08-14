# Public portfolio manifest

This manifest preserves the initial sanitized public-release record and tracks the current portfolio readiness state.

- Sanitized rewrite base HEAD: `cd7e89a19918f823bdd18ed74d68c4588b35df8b`
- Audited release content HEAD: `1c315dab9fa6a73ca08f9a4a980bbc3a79a803e3`
- Audited release content tree: `abb1eb6039776ea2ef791f92ee09856f66e96622`
- Commits after metadata rewrite: 11
- Commits after MIT release content: 12
- Runtime: Node.js `20.20.1`, pnpm `10.34.5`
- Package status: private monorepo, version `0.1.0`
- Public status: **Portfolio Preview**
- Release gate: `PUBLIC_RELEASE_READY`
- Publication status: `PUBLICATION_APPROVAL_REQUIRED`
- License: `MIT`
- `LICENSE=MIT`
- Repository: `https://github.com/luanaabastos/qualityops-hub`
- Current product milestone: Checkpoint 7 portfolio polish

The manifest commit changes HEAD by definition without changing the release facts above. The final HEAD is reported by `git rev-parse HEAD` after this file is committed.

## Git history sanitization

All reachable commits use the authorized public identity for both author and committer. The `LEGACY_NON_PUBLIC_GIT_IDENTITY` metadata was replaced without changing commit messages, commit order, author/committer timestamps, per-commit trees, or the final pre-release tree.

- Commits before rewrite: 11
- Commits after rewrite: 11
- Final tree equivalence: passed
- Commit-tree sequence equivalence: passed
- Commit-message sequence equivalence: passed
- Timestamp equivalence: passed
- Old backup/original refs remaining: 0

No squash or remote operation was performed.

## Validation

| Gate | Result | Detail |
|---|---|---|
| Frozen install | Passed | Lockfile current; no resolution drift |
| Lint | Passed | All workspaces |
| Typecheck | Passed | All workspaces |
| Tests | Passed | 35 executed, 35 passed, 0 failed, 0 skipped |
| Build | Passed | Shared, API, and Vite web build |
| Playwright E2E | Passed | 9 local and 6 production-like scenarios; 0 failed, 0 skipped |
| Demo reset | Passed | Restored exactly 12 curated seeded executions |
| Responsive matrix | Passed | 1920×1080 through 320×568 with no page-level overflow |

## Demo smoke

| Product | Mode | Executed | Passed | Failed | Errors | Approval |
|---|---|---:|---:|---:|---:|---:|
| ShopSphere | Success | 5 | 5 | 0 | 0 | 100% |
| ShopSphere | Functional failure | 5 | 4 | 1 | 0 | 80% |
| ServiceDesk | Success | 5 | 5 | 0 | 0 | 100% |
| PocketWallet | Infrastructure failure | 0 | 0 | 0 | 1 | null |

PocketWallet remained an explicit `MOBILE_HARNESS_DEMO` infrastructure failure with `status=ERROR`, `executed=0`, and `approvalRate=null`.

## Scans

- `CORPORATE_REFERENCE_SCAN=ZERO_FINDINGS`
- `SECRET_SCAN=ZERO_FINDINGS`
- `GIT_HISTORY_SCAN=ZERO_FINDINGS`
- `PUBLIC_PATH_SCAN=ZERO_FINDINGS`
- `PUBLIC_ASSET_SCAN=ZERO_FINDINGS`
- `PUBLIC_GIT_IDENTITY_SCAN=ZERO_FINDINGS`

## Public assets

All five PNG files were visually inspected. They contain only the QualityOps Hub application UI: no editor, terminal, desktop, taskbar, browser profile, bookmarks, notification, real email, or personal path.

Checkpoint 7 additionally generated and visually reviewed 15 ignored local evidence captures covering every primary route plus Overview and Pipeline Lab on mobile. Existing README screenshots remain unchanged pending an explicit decision to replace the curated public assets.

| Asset | SHA-256 |
|---|---|
| `docs/assets/execution-details.png` | `5222a489e29b7f2c3c1caab52b8b9ddb4e9ac268ed54c43119d6157661dd9ba1` |
| `docs/assets/infrastructure-error.png` | `21aa80883fa9270d5c98581ffbe95349d4dde61f8cdd0fafebc1716d996d737c` |
| `docs/assets/overview.png` | `179479c9ae9eec182c23b6ed4cd07e1d21b5920844c842bd6df916cb34d5e43a` |
| `docs/assets/pipeline-lab.png` | `c71a01c3a6de1415529f863e1dffa5eda6591f859b320b7c6d0b0fc52a999c94` |
| `docs/assets/regression-delta.png` | `dfe3615558276fbecc2553bda37e6f56b2aabb94ac2eea32d86c3e86c02324f9` |

## Workflows

- `platform.yml`: frozen install, PostgreSQL, lint, typecheck, tests, build, scans, and Chromium E2E.
- `demo-shopsphere.yml`: Cypress and Mochawesome artifact generation.
- `demo-servicedesk.yml`: Playwright and versioned JSON artifact generation.
- `demo-pocketwallet.yml`: Mobile Harness Demo JSON artifact generation.

All workflows use read-only repository permissions and bounded timeouts. They intentionally do not attempt remote ingestion before a public API exists.

## Known limitations

- Hosted-runtime configuration is prepared, but no hosted endpoint or provider resource exists.
- In-process jobs have no distributed queue or cross-instance recovery.
- Pipeline Lab has a bounded in-process request limiter; no distributed rate limiter is implemented.
- No user accounts, roles, tenant boundaries, or audit-log service.
- Object storage is not configured; raw reports remain ignored local artifacts.
- Integration tokens require explicit rotation/revocation and have no automatic expiry.
- PocketWallet is a deterministic Mobile Harness Demo, not a real device run.
- Automation Coverage, Automation Plan, adapter status, and in-app documentation use explicit fictional demo models rather than external systems of record.
- Video Evidence is a concept preview; upload and persistent object storage remain roadmap work.
- Flaky Test Radar and remote GitHub ingestion remain roadmap work.
- Registry-backed dependency advisory review remains necessary before a hosted deployment.

## Hosting boundary

The repository is public and the portfolio product gate is complete. Render, Neon, remote secrets, and public hosting have not been provisioned; those actions still require separate explicit human approval.
