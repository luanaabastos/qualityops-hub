# QualityOps Hub — Checkpoint 3 evidence

Status: complete

Runtime: Node.js 20.20.1, pnpm 10.34.5

Repository state: local only, no remote

## Runtime and install

pnpm 10.34.5 was selected because the official pnpm compatibility matrix supports Node.js 20 for pnpm 10, while pnpm 11 requires a newer Node.js line. The exact version is pinned in `packageManager`, `volta` and `engines`.

The lockfile was regenerated once because the previous package-manager major was incompatible and the root Playwright declaration was missing from the lock. Existing resolved dependency versions were preserved; the functional additions are Playwright and its required packages. A subsequent frozen install passed without resolution changes or interactive prompts. Only `esbuild` is authorized to run install scripts.

## Demo runtime

| Check | Result |
|:--|:--|
| `demo:start` | PASS |
| `demo:status` | PASS — web and API PIDs verified |
| `demo:stop` | PASS |
| Frontend | `http://localhost:5173` |
| API | `http://localhost:3001` |
| Health | `http://localhost:3001/api/health` — `ok` |
| Readiness | `http://localhost:3001/api/readiness` — demo data ready |

Readiness accurately reports PostgreSQL, object storage and background jobs as not required by the current in-memory demo mode.

## Route and viewport acceptance

Desktop includes 1440×900 and 1280×720; tablet is 768×1024; mobile includes 390×844 and 320×568.

| Route | Desktop | Tablet | Mobile | Result |
|:--|:--:|:--:|:--:|:--:|
| `/` | PASS | PASS | PASS | PASS |
| `/products` | PASS | PASS | PASS | PASS |
| `/products/shopsphere` | PASS | PASS | PASS | PASS |
| `/products/servicedesk` | PASS | PASS | PASS | PASS |
| `/products/pocketwallet` | PASS | PASS | PASS | PASS |
| `/executions` | PASS | PASS | PASS | PASS |
| `/how-it-works` | PASS | PASS | PASS | PASS |
| `/coverage` | PASS | PASS | PASS | PASS |
| `/integrations` | PASS | PASS | PASS | PASS |
| `/automation-plan` | PASS | PASS | PASS | PASS |
| `/video-evidence` | PASS | PASS | PASS | PASS |
| `/documentation` | PASS | PASS | PASS | PASS |
| `/platform-health` | PASS | PASS | PASS | PASS |

The matrix checks that the main content remains visible and that the document has no page-level horizontal overflow. Wide tables remain keyboard-focusable and horizontally scrollable inside their containers.

## Product acceptance

- ShopSphere displays Cypress, Mochawesome and a regression delta computed by stable scenario identity.
- ServiceDesk makes its stale state explicit in the header, notice and execution history.
- PocketWallet is labeled `MOBILE HARNESS DEMO`; it shows a synthetic infrastructure error followed by recovery and explicitly disclaims a real Android execution.
- Execution filters cover passed, failed, stale and infrastructure-error outcomes, including an explicit empty state.
- Automation coverage remains unconfigured and is never invented.

## Accessibility corrections

- Added semantic page headings, landmarks, table captions and a skip link.
- Added visible focus styling and accessible names for controls.
- Added a mobile hamburger, modal drawer, overlay, Escape close, navigation close, focus trap and focus restoration.
- Added polite live regions for loading/count feedback and alert semantics for errors.
- Kept contrast-aware status indicators with text labels in addition to color.

## Playwright

| Project | Executed | Passed | Failed | Skipped |
|:--|--:|--:|--:|--:|
| Chromium | 12 | 12 | 0 | 0 |
| Mobile Chrome | 12 | 12 | 0 | 0 |
| Total | 24 | 24 | 0 | 0 |

The suite covers overview, products, all three product details, execution filters, empty state, stale state, infrastructure error, public flow, handled errors, mobile drawer behavior and the full route/viewport matrix.

## Gates

| Gate | Executed | Passed | Failed | Skipped |
|:--|--:|--:|--:|--:|
| Frozen install | 1 | 1 | 0 | 0 |
| Lint | 3 workspaces | 3 | 0 | 0 |
| Typecheck | 3 workspaces | 3 | 0 | 0 |
| Unit/integration tests | 7 tests | 7 | 0 | 0 |
| Build | 3 workspaces | 3 | 0 | 0 |
| Playwright | 24 tests | 24 | 0 | 0 |

## Visual evidence

Local artifact directory:

`artifacts/frontend-review/2026-08-13T00-18-33-731Z/`

The ignored directory contains 13 application screenshots and a manifest with filename, route, viewport, timestamp, commit, `syntheticData=true` and SHA-256 for every image.

All screenshots were inspected. The mobile drawer capture mode and PocketWallet evidence viewport were corrected, then only the three affected images were regenerated and re-inspected.

## Scans and Git

The reference and secret scanners cover current source, documentation, workflow/package metadata, relevant untracked files, visual manifests, Git history and local Git configuration without printing candidate values.

Expected final state:

```text
CORPORATE_REFERENCE_SCAN=ZERO_FINDINGS
SECRET_SCAN=ZERO_FINDINGS
REMOTE=NONE
GITHUB_REPOSITORY=NOT_CREATED
PUSH=NOT_PERFORMED
```
