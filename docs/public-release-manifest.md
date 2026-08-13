# Public release manifest

This manifest records the audited content commit immediately before this manifest-only commit.

- Audited content commit: `c4e0698f98494769c5e2f649a521c060a4d58a1d`
- Runtime: Node.js `20.20.1`, pnpm `10.34.5`
- Package status: private monorepo, version `0.1.0`
- Public status: **Portfolio Preview**
- Publication status: `PUBLIC_HISTORY_BLOCKER`
- License status: `LICENSE_DECISION_REQUIRED`
- Remote: none

## Validation

| Gate | Result | Detail |
|---|---|---|
| Frozen install | Passed | Lockfile current; no dependency resolution drift |
| Lint | Passed | All workspaces |
| Typecheck | Passed | All workspaces |
| Tests | Passed | 24 executed, 24 passed, 0 failed, 0 skipped |
| Build | Passed | Shared, API, and Vite web build |
| Playwright E2E | Passed | 4 executed, 4 passed, 0 failed, 0 skipped |
| Demo reset | Passed | Refused without confirmation; local reset, seed, and restart succeeded with confirmation |
| Demo lifecycle | Passed | Start, status, and stop succeeded |

The final live demo set persisted these outcomes:

| Product | Mode | Executed | Passed | Failed | Errors |
|---|---|---:|---:|---:|---:|
| ShopSphere | Success | 5 | 5 | 0 | 0 |
| ShopSphere | Functional failure | 5 | 4 | 1 | 0 |
| ServiceDesk | Success | 5 | 5 | 0 | 0 |
| PocketWallet | Infrastructure failure | 0 | 0 | 0 | 1 |

## Scans

- `CORPORATE_REFERENCE_SCAN=FINDINGS`
- `SECRET_SCAN=ZERO_FINDINGS`
- `GIT_HISTORY_SCAN=FINDINGS`
- `PUBLIC_PATH_SCAN=ZERO_FINDINGS`
- `PUBLIC_ASSET_SCAN=ZERO_FINDINGS`

### Public history blocker

The following legacy commits contain a personal author name and a corporate-domain author email in commit metadata:

- `783b98fb589b0c63da83c97a31b08b86b4a9019b`
- `afb3bf656dc42b37a9255cba8311d08bbfae7570`
- `a082da6c58f05e8dd86c068186033bbd7f45af8d`
- `4c9f9b0df966aad8f5b8ffba0703dafc6f3e2f47`
- `5a803444efd61ee59f14602638a639be0a32e24b`
- `f18b0528a61a809269273f5d2e56e4558ef77485`
- `ad019baeb9750a2091557c9f47a5b99f38a77bf1`
- `46bf3701fb6bd76a1e6397c33b4b42a2a8cdc114`

No sensitive value is reproduced here. Correcting those fields requires an explicitly authorized history rewrite. The two Checkpoint 5 content commits use the neutral public identity `QualityOps Hub` with an example-domain email. Publication remains blocked until a human chooses whether and how to rewrite the eight legacy commits.

## Public assets

All five PNG files were visually inspected. They contain only the QualityOps Hub application UI: no editor, terminal, desktop, taskbar, browser profile, bookmarks, notification, real email, or personal path.

| Asset | SHA-256 |
|---|---|
| `docs/assets/execution-details.png` | `5222a489e29b7f2c3c1caab52b8b9ddb4e9ac268ed54c43119d6157661dd9ba1` |
| `docs/assets/infrastructure-error.png` | `21aa80883fa9270d5c98581ffbe95349d4dde61f8cdd0fafebc1716d996d737c` |
| `docs/assets/overview.png` | `179479c9ae9eec182c23b6ed4cd07e1d21b5920844c842bd6df916cb34d5e43a` |
| `docs/assets/pipeline-lab.png` | `c71a01c3a6de1415529f863e1dffa5eda6591f859b320b7c6d0b0fc52a999c94` |
| `docs/assets/regression-delta.png` | `dfe3615558276fbecc2553bda37e6f56b2aabb94ac2eea32d86c3e86c02324f9` |

## Workflows

- `platform.yml`: frozen install, PostgreSQL, lint, typecheck, tests, build, scans, and Chromium E2E.
- `demo-shopsphere.yml`: runs Cypress and uploads a Mochawesome artifact.
- `demo-servicedesk.yml`: runs Playwright and uploads a versioned JSON artifact.
- `demo-pocketwallet.yml`: runs the Mobile Harness Demo and uploads its JSON artifact.

All workflows have read-only repository permissions and bounded timeouts. Demo workflows intentionally do not attempt remote ingestion. A future hosted API and approved CI secrets are prerequisites for that milestone.

## Dependency review

The dependency graph is deduplicated as far as pnpm's local check can determine. Three unused web-development packages were removed without updating application dependencies. Critical runtime dependencies are Fastify, `@fastify/cors`, PostgreSQL `pg`, Zod, React, React DOM, and React Router. Cypress, Playwright, and Mochawesome are critical demo/test tools.

The lockfile reports three deprecated transitive packages inherited through tools. No mass upgrade was performed. A registry-backed vulnerability advisory check was not performed because this gate did not authorize external registry access; that remains required before any hosted deployment.

## Known limitations

- Local-only API and demo; no hosted endpoint exists.
- In-process demo jobs have no distributed queue or crash recovery.
- No application or distributed rate limiter.
- No user accounts, roles, tenant boundaries, or audit-log service.
- Object storage is not configured; raw reports remain ignored local artifacts.
- Integration tokens require explicit rotation/revocation and have no automatic expiry.
- PocketWallet is a deterministic Mobile Harness Demo, not a real device run.
- Automation Coverage, Flaky Test Radar, Video Evidence, and richer hosted integrations are roadmap items.

## License recommendation

MIT is recommended for this small personal portfolio project because it is concise, familiar, and permissive. Apache-2.0 is also permissive and adds an explicit patent grant and notice obligations, which is valuable for larger contributor or corporate ecosystems but adds complexity not currently needed here.

No `LICENSE` file has been created. A human decision is required.
