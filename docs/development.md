# Development runtime

QualityOps Hub is validated with Node.js 20.20.1 and pnpm 10.34.5. Both versions are pinned in the root `package.json`.

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
