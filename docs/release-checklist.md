# v1.0.0 portfolio release checklist

QualityOps Hub v1.0.0 is published as a final portfolio release. The repository, hosted demo, annotated tag, and GitHub Release are public.

## Product and evidence

- [x] Hosted Render/Neon demo is public and healthy.
- [x] External CI is active for ShopSphere and ServiceDesk.
- [x] ShopSphere success proof: 5 executed, 5 passed.
- [x] ServiceDesk success proof: 5 executed, 5 passed.
- [x] ShopSphere functional-failure proof: 5 executed, 4 passed, 1 failed.
- [x] Raw reports are retained as GitHub Actions artifacts before ingestion.
- [x] Dashboard execution links and Regression Delta are public.
- [x] Hosted preview and seed history do not affect official metrics.
- [x] Every displayed product and dataset is fictional and synthetic.

## Repository presentation

- [x] README explains problem, solution, architecture, stack, evidence, decisions, security, and limitations.
- [x] Live Demo, Architecture, and CI status are above the fold.
- [x] LICENSE is MIT.
- [x] SECURITY and CONTRIBUTING reflect the public portfolio scope.
- [x] Six final screenshots are visually reviewed and sanitized.
- [x] Repository description is factual and the topics are relevant.
- [x] Portuguese and English portfolio material is ready.
- [x] Portfolio case study is ready.
- [x] v1.0.0 release notes match the published final release.

## Experience review

- [x] Every primary route has exactly one semantic `h1` and ordered heading levels.
- [x] Interactive controls expose text or programmatic labels.
- [x] Keyboard focus uses a visible 3 px outline.
- [x] Mobile navigation traps focus, closes with Escape, and restores focus.
- [x] Key palette pairs pass WCAG AA for normal text; the lowest measured ratio is 8.94:1.
- [x] Primary routes have zero page-level horizontal overflow at 1440×900, 1280×720, 768×1024, 390×844, and 320×568.

## Final gates

- [x] Node.js `20.20.1` and pnpm `10.34.5` confirmed.
- [x] Frozen install passed with no lockfile or resolution drift.
- [x] Lint passed.
- [x] Typecheck passed.
- [x] Unit and PostgreSQL integration tests passed: 60 passed, 0 failed, 0 skipped.
- [x] Build passed.
- [x] Local Playwright passed: 10 passed, 0 failed, 0 skipped.
- [x] Production Playwright passed: 6 passed, 0 failed, 0 skipped.
- [x] Hosted-preview Playwright passed: 1 passed, 0 failed, 0 skipped.

## Publication

- [x] Annotated tag [`v1.0.0`](https://github.com/luanaabastos/testops-hub/tree/v1.0.0) points to the approved release commit.
- [x] Final [GitHub Release](https://github.com/luanaabastos/testops-hub/releases/tag/v1.0.0) is published without attached local artifacts.

`QUALITYOPS_V1_RELEASE_PUBLISHED`

`QUALITYOPS_PORTFOLIO_PROJECT_COMPLETE`
