-- Prisma schema migration placeholder for initial checkpoint.
-- This project keeps the real Prisma migration logic in an initial migration generated locally.
CREATE TABLE IF NOT EXISTS "Product" (
  "id" TEXT PRIMARY KEY,
  "productKey" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "framework" TEXT NOT NULL,
  "reportFormat" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "branch" TEXT NOT NULL,
  "latestPipeline" TEXT,
  "freshness" TEXT NOT NULL,
  "automationCoverage" DOUBLE PRECISION,
  "lastExecutionAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "PipelineMetadata" (
  "id" TEXT PRIMARY KEY,
  "provider" TEXT NOT NULL DEFAULT 'github-actions',
  "repository" TEXT NOT NULL,
  "branch" TEXT NOT NULL,
  "commitSha" TEXT NOT NULL,
  "pipelineId" TEXT NOT NULL,
  "pipelineUrl" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "jobName" TEXT NOT NULL,
  "jobUrl" TEXT NOT NULL,
  "artifactUrl" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "suiteType" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "finishedAt" TIMESTAMP(3) NOT NULL,
  "executionId" TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS "TestExecution" (
  "id" TEXT PRIMARY KEY,
  "productId" TEXT NOT NULL,
  "executionKey" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL,
  "total" INTEGER NOT NULL,
  "executed" INTEGER NOT NULL,
  "passed" INTEGER NOT NULL,
  "failed" INTEGER NOT NULL,
  "skipped" INTEGER NOT NULL,
  "infrastructureErrors" INTEGER NOT NULL,
  "durationMs" INTEGER NOT NULL,
  "approvalRate" DOUBLE PRECISION,
  "qualityScore" DOUBLE PRECISION,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "finishedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TestSuite" (
  "id" TEXT PRIMARY KEY,
  "executionId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "suiteType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "total" INTEGER NOT NULL,
  "passed" INTEGER NOT NULL,
  "failed" INTEGER NOT NULL,
  "skipped" INTEGER NOT NULL,
  "infrastructureErrors" INTEGER NOT NULL,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "TestCaseResult" (
  "id" TEXT PRIMARY KEY,
  "suiteId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "scenarioId" TEXT,
  "status" TEXT NOT NULL,
  "durationMs" INTEGER NOT NULL,
  "errorType" TEXT,
  "errorMessage" TEXT,
  "isNewFailure" BOOLEAN NOT NULL DEFAULT FALSE,
  "isRecovered" BOOLEAN NOT NULL DEFAULT FALSE,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3)
);
