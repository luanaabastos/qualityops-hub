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
| E. URL or repository path | GitHub repository, Render URL, local folder and remote origin | Preserve until a separate decision |
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
- Repository `luanaabastos/qualityops-hub` and local folder `qualityops-hub`.
- Render service and URL `qualityops-hub.onrender.com`.
- Workflow IDs, run URLs, artifact URLs and persisted execution IDs.
- Database tables, migrations, API fields and historical Git commits.

Keeping these names avoids a risky migration with no visitor-facing benefit. Public copy explicitly documents the distinction.

## Historical v1.0.0 boundary

The existing annotated `v1.0.0` tag and GitHub Release were published before this rename under the previous public name. They remain immutable historical evidence. This checkpoint creates no tag and no Release.

## Repository rename impact

| Area | Impact of `qualityops-hub` → `testops-hub` |
|---|---|
| Render integration | The linked source repository may need to be reconnected. Manual deploy settings must be revalidated. The service name and public URL can remain unchanged unless separately migrated. |
| GitHub Actions | Workflow files continue with the repository, but badges, API calls and documentation should use the new slug. Existing run and artifact URLs are historical evidence and must be verified through GitHub redirects. |
| README and badges | Repository links, badges, clone commands and evidence tables require a coordinated update. |
| Artifact URLs | Existing workflow artifact links contain the old repository path. Redirect behavior and artifact availability must be checked without rewriting historical IDs. |
| Local clone | The folder does not need to change, but `origin` would need the new URL after the remote rename. |
| Screenshots | Product screenshots are independent from the repository slug once the visible application name is TestOps Hub. |
| Public execution links | Execution IDs use the Render URL and are independent from the GitHub repository name. |
| GitHub Pages | Not configured; no impact today. |
| Neon | Database schema and connection configuration do not depend on the repository slug. No database rename is needed. |
| External CI references | `QUALITYOPS_*` secrets and the Render ingestion URL should remain stable. Workflow documentation can explain that these are legacy-compatible technical names. |

## Risks

- GitHub and Render integration behavior must be verified before any repository rename.
- Public links may rely on redirects, while badges and clone instructions should eventually use the canonical new slug.
- Historical v1.0.0 evidence must remain traceable even if the repository name changes later.
- Renaming environment variables, package scopes or databases at the same time would add migration risk without improving product clarity.

## Recommendation

Keep the repository named `qualityops-hub` for this checkpoint. Use **TestOps Hub** as the public product identity now, then evaluate a repository rename as a separate, explicitly approved migration with a link inventory, Render reconnection plan and rollback check.

`REPOSITORY_RENAME_IMPACT=DOCUMENTED`

`REPOSITORY_RENAME_RECOMMENDATION=DEFER_UNTIL_HUMAN_APPROVAL`
