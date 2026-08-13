import fs from 'node:fs';
import path from 'node:path';
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

type Entry = {
  file: string;
  suitePath: string[];
  title: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';
  durationMs: number;
  error: { message: string; stack?: string } | null;
};

class VersionedReporter implements Reporter {
  private readonly tests: Entry[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    const relativeFile = path.relative(process.cwd(), test.location.file).replaceAll('\\', '/');
    const filename = path.basename(test.location.file);
    const suitePath = test.titlePath().slice(0, -1).filter((part) => part.length > 0 && part !== filename);
    this.tests.push({
      file: relativeFile,
      suitePath: suitePath.length > 0 ? suitePath : ['ServiceDesk demo pipeline'],
      title: test.title,
      status: result.status,
      durationMs: result.duration,
      error: result.error ? { message: result.error.message ?? 'Playwright assertion failed', stack: result.error.stack } : null
    });
  }

  onEnd() {
    const directory = process.env.DEMO_ARTIFACT_DIR;
    if (!directory) throw new Error('DEMO_ARTIFACT_DIR is required');
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'raw-report.json'), JSON.stringify({
      version: 'playwright-json-v1',
      framework: 'Playwright',
      infrastructureError: null,
      tests: this.tests
    }, null, 2));
  }
}

export default VersionedReporter;
