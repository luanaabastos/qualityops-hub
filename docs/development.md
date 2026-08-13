# Development runtime

Use `pnpm demo:start` to start the Compose PostgreSQL service and both local applications. The API applies ordered migrations before seeding fictional data. Compose creates separate `qualityops_dev` and `qualityops_test` databases so integration cleanup can never remove demo history or runtime tokens. All gates require PostgreSQL and must complete with no skipped tests. Runner output belongs only below ignored `artifacts/demo-runs` paths.

QualityOps Hub is validated with Node.js 20.20.1 and pnpm 10.34.5. Both versions are pinned in the root `package.json`.

Volta is the recommended optional runtime manager. Installing Volta is not required if the exact versions are already active.

## Windows PATH checks

On Windows machines with more than one Node.js installation, inspect command resolution before installing dependencies:

```powershell
where.exe node
where.exe pnpm
Get-Command node
Get-Command pnpm
node --version
pnpm --version
```

Volta shims should precede conflicting global Node.js or Corepack installations in `PATH`. If command resolution is incorrect, adjust the user or system PATH through Windows settings, reopen the terminal and repeat the checks.

Do not loosen the project's Node engine range to accommodate a machine-specific PATH conflict.

## Reproducible install

```powershell
pnpm install --frozen-lockfile
```

The workspace permits build scripts only for `esbuild`, as declared in `pnpm-workspace.yaml`.

## Reset the local demo

```powershell
pnpm demo:reset -- --confirm-local-demo-reset
```

This truncates only demo execution data in the loopback `qualityops_dev` database, recreates the deterministic synthetic history, removes only generated project demo-run artifacts, and restarts the local demo. It refuses a remote host or a different database name.
