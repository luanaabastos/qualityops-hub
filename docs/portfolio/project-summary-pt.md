# TestOps Hub — resumo do projeto

## Visão geral

**Uma plataforma que centraliza resultados de testes automatizados, histórico de execuções, cobertura e sinais de regressão.**

TestOps Hub é uma plataforma open source de portfólio criada para tornar evidências de testes da CI mais fáceis de entender. Ela recebe relatórios produzidos por frameworks diferentes, normaliza seus resultados e apresenta histórico, métricas de qualidade, rastreabilidade de pipeline e sinais de regressão em uma interface única.

Todos os produtos, usuários, testes e dados exibidos são fictícios e sintéticos.

## Problema

Em uma cadeia de automação, a evidência costuma ficar distribuída entre o status do CI, relatórios do framework, artifacts, logs e execuções anteriores. Comparar resultados ou investigar uma regressão exige reconciliar manualmente formatos e fontes diferentes.

## Solução

O projeto define uma fronteira de ingestão autenticada e adapters versionados para Mochawesome, `playwright-json-v1` e `mobile-e2e-json-v1`. Cada relatório válido se transforma em uma execução normalizada, com suítes, casos, contagens, diagnósticos sanitizados e metadados de pipeline. O histórico é persistido no PostgreSQL e alimenta Approval Rate, Quality Score, Execution Details e Regression Delta.

## Arquitetura

GitHub Actions executa Cypress e Playwright em browsers reais e preserva os relatórios como artifacts. A API Fastify hospedada no Render autentica e valida a ingestão. Adapters convertem cada formato para um modelo comum, e o Neon PostgreSQL persiste o resultado. A interface React, também hospedada no Render, consulta a API na mesma origem.

O Pipeline Lab usa runners locais fixos e permitidos no modo de desenvolvimento. Na demo hospedada ele apresenta somente uma prévia do fluxo, sem iniciar browsers nem alterar métricas oficiais.

## Resultado comprovado

Três workflows públicos comprovam o fluxo externo: ShopSphere com 5/5 testes aprovados, ServiceDesk com 5/5 e ShopSphere com 4/5 e uma falha funcional intencional. O dashboard oficial agrega os últimos resultados de cada produto externo em 10 executados, 9 aprovados, 1 falha, 90% de aprovação e 90% de Quality Score.

Demo: https://qualityops-hub.onrender.com<br>
Repositório: https://github.com/luanaabastos/testops-hub
