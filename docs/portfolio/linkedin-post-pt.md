# Post para LinkedIn — Português

Resultados de automação costumam ficar espalhados entre pipelines, relatórios específicos de cada framework, artifacts, logs e execuções históricas. O desafio não é apenas saber se o job terminou: é transformar essas evidências em um histórico comparável e rastreável.

Criei o **QualityOps Hub**, um projeto open source de portfólio que normaliza relatórios de testes e apresenta sinais de qualidade em uma única experiência.

A arquitetura separa execução e análise:

- GitHub Actions executa browsers reais com Cypress e Playwright;
- os relatórios Mochawesome e Playwright JSON são preservados como artifacts;
- uma API Fastify autenticada recebe cada relatório;
- adapters versionados convertem formatos diferentes para um modelo comum;
- o Neon PostgreSQL persiste o histórico;
- uma aplicação React no Render mostra métricas, detalhes e Regression Delta.

Uma decisão importante foi não executar browsers no Render Free. O ambiente hospedado fica responsável pela aplicação e pela API, enquanto o CI externo executa os testes. O Pipeline Lab público demonstra o fluxo sem criar evidência oficial.

A prova pública inclui três workflows reais: ShopSphere com sucesso, ServiceDesk com sucesso e ShopSphere com uma falha funcional intencional. O dashboard oficial resultante mostra 10 testes executados, 9 aprovados, 1 falha e 90% de aprovação.

Todos os produtos e dados são fictícios e sintéticos.

Demo: https://qualityops-hub.onrender.com<br>
Código e evidências: https://github.com/luanaabastos/qualityops-hub

#QualityEngineering #TestAutomation #Playwright #Cypress #TypeScript #GitHubActions
