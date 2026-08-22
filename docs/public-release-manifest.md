# Public portfolio release manifest

This manifest records the published QualityOps Hub v1.0.0 portfolio release.

- Release commit: `f9082fba51a2625609783cb9cb69c6739d41dc91`
- Branch: `main`
- Runtime: Node.js `20.20.1`, pnpm `10.34.5`
- Package status: private monorepo packages, version `1.0.0`
- Public status: **v1.0.0 published**
- License: `MIT`
- `LICENSE=MIT`
- Repository: `https://github.com/luanaabastos/qualityops-hub`
- Live demo: `https://qualityops-hub.onrender.com`
- External CI: `EXTERNAL_CI_ACTIVE`
- Tag: [`v1.0.0`](https://github.com/luanaabastos/qualityops-hub/tree/v1.0.0)
- Release: [`PUBLISHED`](https://github.com/luanaabastos/qualityops-hub/releases/tag/v1.0.0)

The annotated tag remains fixed at the approved release commit. This closure documentation does not move the tag or create another release.

## Real CI evidence

| Scenario | Executed | Passed | Failed | Workflow | Artifact | Execution |
|---|---:|---:|---:|---|---|---|
| ShopSphere success | 5 | 5 | 0 | [Run](https://github.com/luanaabastos/qualityops-hub/actions/runs/32431118788) | [Report](https://github.com/luanaabastos/qualityops-hub/actions/runs/32431118788/artifacts/9429101193) | [Dashboard](https://qualityops-hub.onrender.com/executions/a8a65b5d-17b2-4714-b3c1-d2192b945963) |
| ServiceDesk success | 5 | 5 | 0 | [Run](https://github.com/luanaabastos/qualityops-hub/actions/runs/32431321053) | [Report](https://github.com/luanaabastos/qualityops-hub/actions/runs/32431321053/artifacts/9429173727) | [Dashboard](https://qualityops-hub.onrender.com/executions/6899dec4-d7d6-4fe9-ba89-7edf30b88d1c) |
| ShopSphere functional failure | 5 | 4 | 1 | [Expected failed run](https://github.com/luanaabastos/qualityops-hub/actions/runs/32431559619) | [Report](https://github.com/luanaabastos/qualityops-hub/actions/runs/32431559619/artifacts/9429251422) | [Dashboard](https://qualityops-hub.onrender.com/executions/af12fdee-6860-4916-a35c-9fce60022556) |

Official aggregate: 10 executed, 9 passed, 1 failed, 0 infrastructure errors, 90% approval, and 90% Quality Score. ShopSphere Regression Delta reports one new failure.

## Validation

| Gate | Result | Detail |
|---|---|---|
| Frozen install | Passed | Lockfile current; no resolution or dependency drift |
| Lint | Passed | All workspaces |
| Typecheck | Passed | All workspaces |
| Tests | Passed | 60 passed, 0 failed, 0 skipped |
| Build | Passed | Shared, API, and Vite web production build |
| Playwright E2E | Passed | 10 local, 6 production, and 1 hosted-preview scenario |
| Responsive matrix | Passed | All primary routes; 1440×900 through 320×568; zero page-level overflow |
| Accessibility review | Passed | Keyboard, focus, headings, labels, contrast, and responsive navigation |

## Public assets

All six PNG files were captured from the public hosted application and visually inspected. They contain only the QualityOps Hub UI: no editor, terminal, desktop chrome, browser profile, email, token, personal path, or notification.

| Asset | SHA-256 |
|---|---|
| `docs/assets/coverage.png` | `04bc630fb8bfe0f80805daf6f1d644674b4e101a28f86a379e74fbd247396e4e` |
| `docs/assets/executions.png` | `da6419ae53f0d8bfd4f77764e772f0e96866190fa94316557bd056d0b92ca4b7` |
| `docs/assets/integrations.png` | `3aaed92eb19898852807e845bd012294cdfdb53eb152db771ebdfdb3982deff9` |
| `docs/assets/overview.png` | `e22feeba9a20d6bfeade38ff3c5cc3e33c3bb0ca7f4bd4c75cb523353da91324` |
| `docs/assets/pipeline-lab.png` | `b89939343dbca1928fd340822bf5e4f42ccfd1a308609c993fad10fc23c202f3` |
| `docs/assets/regression-delta.png` | `2e60ba6bc7326ac6f29b328ca13ef08d74820b6ffec477643988be79f5b3eb89` |

## Public-release scans

- `CORPORATE_REFERENCE_SCAN=ZERO_FINDINGS`
- `SECRET_SCAN=ZERO_FINDINGS`
- `GIT_HISTORY_SCAN=ZERO_FINDINGS`
- `PUBLIC_PATH_SCAN=ZERO_FINDINGS`
- `PUBLIC_ASSET_SCAN=ZERO_FINDINGS`
- `PUBLIC_GIT_IDENTITY_SCAN=ZERO_FINDINGS`

## Known limitations

- PocketWallet is a deterministic Mobile Harness Demo, not a real Android device.
- The hosted free tier previews Pipeline Lab state transitions and starts no browser.
- Render Free can cold-start.
- Object storage is not configured.
- There is no user authentication, multi-tenancy, distributed queue, or distributed rate limiting.
- Every portfolio product and dataset is fictional and synthetic.

`QUALITYOPS_V1_RELEASE_PUBLISHED`

`QUALITYOPS_PORTFOLIO_PROJECT_COMPLETE`
