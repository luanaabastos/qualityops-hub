# Public portfolio release manifest

This manifest records the historical QualityOps Hub v1.0.0 portfolio release. The current public product name is **TestOps Hub**; the existing tag and release remain unchanged as historical evidence.

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
| Playwright E2E | Passed | 11 local, 6 production, and 1 hosted-preview scenario |
| Responsive matrix | Passed | All primary routes; 1440×900 through 320×568; zero page-level overflow |
| Accessibility review | Passed | Keyboard, focus, headings, labels, contrast, and responsive navigation |

## Public assets

All six PNG files were captured from the public hosted application after the TestOps Hub rename and visually inspected. They contain only the TestOps Hub UI: no editor, terminal, desktop chrome, browser profile, email, token, personal path, or notification.

| Asset | SHA-256 |
|---|---|
| `docs/assets/coverage.png` | `0cc712bc6b37cc266234b1080cc5c4241b6be907611ce06084490887522496c4` |
| `docs/assets/executions.png` | `2bfbcd47a2081c0e327278807d844368dece82ea0fdb917f1708d8a10f38ea62` |
| `docs/assets/integrations.png` | `e4bed5b7b0b914d355cd1a6d76d7f17f1fba805e7a6ecbf495077c6f819c73d7` |
| `docs/assets/overview.png` | `0b8ccec401374e99a1cba4848cb3943afe101e8ff00b8b4089b31406a75d9671` |
| `docs/assets/pipeline-lab.png` | `f28a1e5ea83e3827450590d291617c0bb0527b7be51e2ac195f30bdf49c6eb72` |
| `docs/assets/regression-delta.png` | `2b0185b1fdd9195965dca042eb2e248240e1f1400f68dfe7d1e2f2eb1120cc0a` |

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
