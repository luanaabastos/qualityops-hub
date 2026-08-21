# QualityOps Hub — project summary

## Overview

QualityOps Hub is an open-source TestOps platform built as an independent portfolio project. It receives reports from different test frameworks, normalizes their results, and presents history, quality metrics, pipeline traceability, and regression signals in one interface.

Every displayed product, user, test, and data point is fictional and synthetic.

## Problem

Automation evidence is usually distributed across CI status, framework reports, artifacts, logs, and earlier executions. Comparing outcomes or investigating a regression requires manual reconciliation across different formats and sources.

## Solution

The project defines an authenticated ingestion boundary and versioned adapters for Mochawesome, `playwright-json-v1`, and `mobile-e2e-json-v1`. Each valid report becomes a normalized execution containing suites, cases, counts, sanitized diagnostics, and pipeline metadata. PostgreSQL stores the history that supports Approval Rate, Quality Score, Execution Details, and Regression Delta.

## Architecture

GitHub Actions runs Cypress and Playwright in real browsers and retains their reports as artifacts. The Fastify API hosted on Render authenticates and validates ingestion. Adapters convert each format into a common model, and Neon PostgreSQL persists the result. The React interface, also hosted on Render, reads the same-origin API.

Pipeline Lab uses fixed, allow-listed local runners during development. In the hosted demo it presents only a flow preview, starts no browser, and cannot change official metrics.

## Proven outcome

Three public workflows prove the external path: ShopSphere with 5/5 passing tests, ServiceDesk with 5/5, and ShopSphere with 4/5 plus one intentional functional failure. The official dashboard aggregates the latest external result per product into 10 executed, 9 passed, 1 failed, 90% approval, and a 90% Quality Score.

Live demo: https://qualityops-hub.onrender.com<br>
Repository: https://github.com/luanaabastos/qualityops-hub
