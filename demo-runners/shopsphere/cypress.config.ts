import path from 'node:path';
import { defineConfig } from 'cypress';

const artifactDirectory = process.env.DEMO_ARTIFACT_DIR ?? path.resolve('artifacts', 'demo-runs', 'manual-shopsphere');

export default defineConfig({
  env: {
    DEMO_MODE: process.env.DEMO_MODE ?? 'SUCCESS'
  },
  e2e: {
    baseUrl: process.env.DEMO_TARGET_URL ?? 'http://127.0.0.1:5173',
    specPattern: 'demo-runners/shopsphere/shopsphere.cy.ts',
    supportFile: false,
    video: false,
    screenshotOnRunFailure: false
  },
  reporter: 'mochawesome',
  reporterOptions: {
    reportDir: artifactDirectory,
    reportFilename: 'raw-report',
    overwrite: true,
    html: false,
    json: true,
    quiet: true
  }
});
