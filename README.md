# ChronoFlow

Orquestrador/scheduler em NestJS + BullMQ para disparar webhooks no horário certo, com histórico de execuções.

## Stack
- NestJS 11, TypeORM (PostgreSQL), BullMQ (Redis)
- Execução HTTP via Axios com timeout e retries
- Scheduler em loop simples que enfileira `chronos` com `nextRunAt` vencido

## Rodando com Docker
```bash
cp .env.example .env
docker compose up --build
# API: http://localhost:3000
# Redis: localhost:6379 | Postgres: localhost:5432
# aplique migrations (em outro terminal, com containers ativos):
yarn migration:run
```

Cron pode ser enviado como expressão padrão (`*/5 * * * *`) ou em formatos simplificados:
- `"<n> min"` (ex.: `"2 min"` vira `*/2 * * * *`)
- `"<n> h"` (ex.: `"6h"` vira `0 */6 * * *`; `"24h"` vira `0 0 */1 * *`)
- `"todo dia as HH[:MM]"` ou `"daily at HH[:MM]"` (ex.: `"todo dia as 18"` vira `0 18 * * *`)

## Configuração de ambiente
Principais variáveis (.env):
- `DATABASE_URL` (ex.: postgres://chrono:chrono@db:5432/chrono)
- `REDIS_URL` (ex.: redis://redis:6379)
- `DEFAULT_TIMEZONE` (ex.: America/Sao_Paulo)
- `BULLMQ_ATTEMPTS`, `BULLMQ_BACKOFF_MS`, `HTTP_REQUEST_TIMEOUT_MS`
- `SCHEDULER_INTERVAL_MS` (loop do scheduler, padrão 30000ms)

## Endpoints principais
- `POST /chronos` cria um job (cron, timezone, url, method, headers, payload, isActive)
- `GET /chronos` lista
- `GET /chronos/:id` detalha
- `PATCH /chronos/:id` atualiza
- `DELETE /chronos/:id` remove
- `POST /chronos/:id/pause` pausa
- `POST /chronos/:id/resume` retoma
- `POST /chronos/:id/trigger` dispara agora (manual)
- `GET /chronos/:id/runs` histórico (paginado via `skip`/`take`)
- `GET /health` healthcheck básico

## Desenvolvimento local (sem docker)
```bash
yarn install
cp .env.example .env
yarn migration:run
yarn start:dev
```

## Estrutura rápida
- `src/jobs/entities` modelos `Chrono` e `ChronoRun`
- `src/jobs/scheduler.service.ts` loop que enfileira jobs vencidos
- `src/jobs/processors/chrono.processor.ts` worker BullMQ que executa HTTP e registra o run
- `docker-compose.yml` sobe Postgres + Redis + API

## Próximos passos sugeridos
- Adicionar migrations TypeORM (tabelas `chronos` e `chrono_runs`)
- Expor retries configuráveis por chrono e observabilidade extra (logs, métricas)
- e2e de criação + execução para validar o fluxo completo
