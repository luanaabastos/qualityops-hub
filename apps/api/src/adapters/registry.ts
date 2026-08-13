import { mochawesomeAdapter } from './mochawesome.js';
import { mobileAdapter } from './mobile.js';
import { playwrightAdapter } from './playwright.js';
import type { ReportAdapter } from './types.js';

export class AdapterRegistry {
  constructor(private readonly adapters: ReportAdapter[]) {}

  resolve(format: string, report: unknown): ReportAdapter {
    const adapter = this.adapters.find((candidate) => candidate.canHandle(format, report));
    if (!adapter) throw new Error(`No report adapter registered for ${format}`);
    adapter.validate(report);
    return adapter;
  }
}

export const adapterRegistry = new AdapterRegistry([
  mochawesomeAdapter,
  playwrightAdapter,
  mobileAdapter
]);
