# GitHub Actions preparation

Four publishable workflow definitions exist locally: platform validation plus one report workflow for each fictional product. They contain no real secret values and have not been run remotely.

After explicit publication authorization, an external workflow can use:

- `QUALITYOPS_URL`: the deployed API base URL
- `QUALITYOPS_INGEST_TOKEN`: a product-scoped raw integration token held only by the CI secret store

The intended flow is tests, artifact upload, then a Bearer-authenticated POST of the framework report. The current repository has no remote and no publishing has occurred.
