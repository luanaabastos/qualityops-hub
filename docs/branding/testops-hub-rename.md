# TestOps Hub public rename

## Decision

- Previous public name: **QualityOps Hub**
- New public name: **TestOps Hub**
- Tagline: **From CI test execution to actionable quality insights.**
- Reason: Improve clarity and make the platform purpose understandable to technical and non-technical visitors.

This is a public product-brand change, not an architecture or data migration. The application, API, database model, CI evidence and hosted URL keep the same technical continuity.

## Occurrence classification

| Class | Meaning | Decision |
|---|---|---|
| A. Public product identity | UI names, page copy, HTML metadata, README and current portfolio material | Rename to TestOps Hub |
| B. Internal technical name | Package scopes, service names and code identifiers | Preserve |
| C. Variable or configuration | `QUALITYOPS_*`, database names, Compose credentials and runner configuration | Preserve |
| D. History or evidence | Existing workflow runs, execution IDs, commit history and the v1.0.0 release snapshot | Preserve |
| E. URL or repository path | GitHub repository, Render URL, local folder and remote origin | Rename the GitHub repository and origin; preserve Render URL and local folder |
| F. Content that must not change | Migration identifiers, database tables, API fields and stable report identities | Preserve |

The inventory was reviewed by context. No global replacement was used.

## What was renamed

- Application shell, mobile header and visible product name.
- Home introduction, product explanation and CI-to-dashboard flow.
- Human-facing evidence labels: Official CI, Hosted Preview, Demo Data and Local Demo.
- HTML title, description and existing Open Graph metadata.
- README, case study, portfolio summaries, LinkedIn drafts and current product documentation.
- Human-facing workflow step names and ingestion log messages where they describe the product.
- Public screenshot set after hosted validation.

## What remains internal

- npm workspace scopes such as `@qualityops-hub/shared`.
- Environment variables such as `QUALITYOPS_URL` and `QUALITYOPS_TOKEN`.
- Local databases `qualityops_dev` and `qualityops_test`.
- API service identifier `qualityops-api`.
- Local folder `qualityops-hub`.
- Render service and URL `qualityops-hub.onrender.com`.
- Workflow IDs, run URLs, artifact URLs and persisted execution IDs.
- Database tables, migrations, API fields and historical Git commits.

Keeping these names avoids a risky migration with no visitor-facing benefit. Public copy explicitly documents the distinction.

## Historical v1.0.0 boundary

The existing annotated `v1.0.0` tag and GitHub Release were published before this rename under the previous public name. They remain immutable historical evidence. This checkpoint creates no tag and no Release.

## Repository rename completion

The existing GitHub repository was renamed in place from `luanaabastos/qualityops-hub` to `luanaabastos/testops-hub` on 2026-08-21. Its commit history, `main` branch, Actions workflows, Repository Secrets, annotated `v1.0.0` tag and GitHub Release were preserved. The local `origin` now uses `https://github.com/luanaabastos/testops-hub.git`.

GitHub redirects the previous repository URL, clone/fetch/push targets and historical workflow/artifact links to the renamed repository. Historical run and artifact URLs retain their original text so published evidence remains traceable. The old repository slug must not be reused, because doing so would remove those redirects.

The local workspace folder remains `qualityops-hub`; this is a local implementation detail with no public effect. The existing Render service and `qualityops-hub.onrender.com` URL also retain their historical technical identifier. No Render service, database, credential or integration token was recreated or changed.

## Repository rename impact

| Area | Impact of `qualityops-hub` → `testops-hub` |
|---|---|
| Render integration | The existing service remains healthy and keeps the historical service name and URL. Its GitHub App access remains associated with the same renamed repository; auto-deploy stays disabled. |
| GitHub Actions | Workflows remain active. Badges, canonical links and documentation use the new slug; historical run and artifact URLs remain valid through GitHub redirects. |
| README and badges | Canonical repository, badge, tag and release links use `testops-hub`. |
| Artifact URLs | Existing workflow artifact links retain the old path and historical IDs; GitHub redirects them to the renamed repository. |
| Local clone | The folder remains `qualityops-hub`; `origin` and branch tracking use the new repository URL. |
| Screenshots | Product screenshots are independent from the repository slug once the visible application name is TestOps Hub. |
| Public execution links | Execution IDs use the Render URL and are independent from the GitHub repository name. |
| GitHub Pages | Not configured; no impact today. |
| Neon | Database schema and connection configuration do not depend on the repository slug. No database rename is needed. |
| External CI references | `QUALITYOPS_*` secrets and the Render ingestion URL should remain stable. Workflow documentation can explain that these are legacy-compatible technical names. |

## Residual risks

- The old GitHub repository slug must not be reused, or historical redirects will stop working.
- Historical workflow and artifact URLs rely on GitHub's repository redirect behavior.
- The local folder and Render URL retain `qualityops-hub`, so documentation must keep distinguishing technical legacy names from the public product identity.
- Renaming environment variables, package scopes or databases at the same time would add migration risk without improving product clarity.

## Final decision

Use `luanaabastos/testops-hub` as the canonical public repository. Preserve the local folder, Render URL, package scopes, environment variables, databases and historical evidence identifiers until a separate migration has a concrete operational benefit.

`REPOSITORY_RENAME_IMPACT=VALIDATED`

`REPOSITORY_RENAME_RECOMMENDATION=COMPLETED_WITH_LOCAL_PATH_PRESERVED`
