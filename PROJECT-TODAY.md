# ChronoFlow — Visão Atual

Orquestrador/scheduler em NestJS + BullMQ para disparar webhooks (e preparar terreno para mensagens) no horário certo, registrando histórico de execuções.

## Stack e Infra
- NestJS 11, TypeORM (PostgreSQL), BullMQ (Redis), Axios e Luxon.
- Config centralizada via `ConfigModule` (`src/infrastructure/config`), lendo `.env`.
- Docker Compose sobe API (dev), Postgres, Redis e WAHA (WhatsApp HTTP API); volumes `waha-sessions` e `waha-media` persistem dados do WAHA.

## Domínio e Dados
- Entidades: `Chrono` (job agendado), `ChronoRun` (execução/histórico), `Channel` (metadados de canal de mensagem).
- Campos principais de `Chrono`: nome/descrição, `cron`, `timezone`, `method`, `url`, `headers/payload`, `isActive`, `targetType` (`HTTP` hoje, `MESSAGE` planejado), `config`, `channelId`, `messageTemplate`, `recipients`, `lastRun*`, `nextRunAt`.
- Campos de `ChronoRun`: `chrono_id`, `scheduled_for`, `started_at/finished_at`, `status`, `http_status`, `response_snippet`, `error_message`, `result`, `attempt`, `duration_ms`.

## Fluxo Atual
1) **Cadastro/edição de chrono** (`POST/PATCH /chronos`): valida target (HTTP ou futuro MESSAGE) e preenche defaults (timezone, método). Normaliza cron (expressão padrão ou atalhos como `2 min`, `6h`, `todo dia as 18`) e calcula `nextRunAt` se ativo.
2) **Scheduler loop** (`SchedulerService`): a cada `SCHEDULER_INTERVAL_MS` (padrão 30s) busca chronos ativos com `nextRunAt <= now`, cria `chrono_run` pendente e enfileira no BullMQ (`chrono-executions`), já avançando `nextRunAt`/`lastRunStatus`.
3) **Worker** (`ChronoProcessor`): consome `execute-chrono`, marca início/tentativa, escolhe executor pelo `targetType` e executa. Atualiza `chrono_run` com status/métricas/resposta e o `Chrono` com `lastRun*`. Erros relançados aproveitam `attempts/backoff` do BullMQ.
4) **Trigger manual** (`POST /chronos/:id/trigger`): cria run imediato e envia à fila com mesma lógica de execução.

## Executor HTTP (implementado)
- Axios com timeout configurável (`HTTP_REQUEST_TIMEOUT_MS`), aceita métodos em `ALLOWED_METHODS`.
- `status` de sucesso se HTTP 2xx/3xx; salva snippet da resposta (1000 chars), `httpStatus`, `errorMessage` quando não-OK, `result` serializado e `durationMs`.

## Mensageria (prévia)
- `targetType=MESSAGE` já validado nos DTOs (exige `channelId`, `messageTemplate`, `recipients`), mas não há executor implementado ainda. Estrutura de `Channel` e módulo WAHA preparam suporte futuro.

## WAHA (WhatsApp HTTP API)
- Módulo `src/waha` expõe rotas `/waha/sessions` para listar/criar/atualizar/deletar/start/stop/logout/restart sessões, ver QR e solicitar código. Usa Axios configurado com `WAHA_BASE_URL` e `WAHA_API_KEY`.

## API Principal
- `POST /chronos` criar | `GET /chronos` listar | `GET /chronos/:id` detalhar | `PATCH /chronos/:id` atualizar | `DELETE /chronos/:id` remover.
- `POST /chronos/:id/pause` | `POST /chronos/:id/resume` | `POST /chronos/:id/trigger`.
- `GET /chronos/:id/runs` histórico paginado (`skip`/`take`).
- `GET /health` healthcheck.

## Ambiente e Execução
- Docker: `cp .env.example .env && docker compose up --build`, depois `yarn migration:run` com containers ativos. Porta API: 3000, Redis: 6379, Postgres: 5432, WAHA: 3001.
- Local sem Docker: `yarn install`, copiar `.env.example`, `yarn migration:run`, `yarn start:dev`.

## Estado Atual e Gaps
- Executor HTTP funcional; executor de mensagem ainda ausente.
- Scheduler simples com polling; não há deduplicação de jobId além do timestamp + id.
- Observabilidade básica (logs Nest). Métricas e logs estruturados pendentes.
- Testes e2e ainda em scaffold (espera “Hello World!”).
