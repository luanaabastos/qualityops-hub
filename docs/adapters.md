# Report adapters

Each adapter implements:

```text
canHandle(format, report)
validate(report)
normalize(context)
```

The central `AdapterRegistry` contains only the Mochawesome, `playwright-json-v1`, and `mobile-e2e-json-v1` adapters. Validation happens before normalization. Common helpers build suites, enforce infrastructure semantics, sanitize diagnostics and generate collision-resistant stable identities using structured JSON fields rather than ambiguous string concatenation.

Adding a format requires a versioned public contract, an isolated adapter and unit/integration coverage. HTTP handlers must remain format-agnostic.
