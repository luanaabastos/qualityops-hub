# Contributing

TestOps Hub is a focused portfolio project. Small, reviewable contributions are preferred.

## Setup

Use Node.js `20.20.1`, pnpm `10.34.5`, and Docker with Compose:

```bash
pnpm install --frozen-lockfile
pnpm demo:start
```

## Branches and commits

Suggested branch names use `feat/`, `fix/`, `docs/`, or `test/` followed by a short topic. Commit messages should be imperative and may use Conventional Commit prefixes such as `feat:`, `fix:`, `test:`, `docs:`, and `chore:`.

## Required checks

Before proposing a change, run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm test:production
pnpm scan:references
pnpm scan:secrets
pnpm scan:public
```

## Safety rules

- Never commit credentials, raw integration tokens, personal paths, or private infrastructure references.
- Use only fictional products, people, organizations, and synthetic data.
- Keep Pipeline Lab runners fixed and allow-listed; never pass client input to a shell.
- Do not expose raw reports or unsanitized diagnostics through the public API.
- Do not weaken validation or convert infrastructure errors into functional failures.

Please report security issues through the process in [SECURITY.md](SECURITY.md), not through a public issue containing sensitive details.
