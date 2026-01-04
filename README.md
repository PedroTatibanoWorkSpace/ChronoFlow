# ChronoFlow

Motor de automação e agendamento (NestJS + BullMQ) que dispara:
- **HTTP** webhooks
- **MESSAGE** via WAHA (WhatsApp HTTP API)
- **FUNCTION** (Cron-as-a-Function) com sandbox seguro e SDK para HTTP/WAHA/state

Registra histórico de execuções e mantém um job por chrono, sem polling pesado.

## Stack e módulos
- NestJS 11, TypeORM (PostgreSQL), BullMQ (Redis), Axios, Luxon.
- Scheduler event-driven (`SchedulerService`): mantém 1 job atrasado por chrono; reagenda ao concluir e desativa one-shot.
- Workers (`ChronoProcessor`): executam conforme `targetType`.
- WAHA integrado (serviço no docker-compose).
- Funções em sandbox (Worker Thread + vm, ctx congelado, timeout/heap limit, allowlist).

## Modelos de dados (principais)
- **Chrono**: id, name/description, cron, timezone, method/url/headers/payload (HTTP), channelId/messageTemplate/recipients (MESSAGE), functionId/extras (FUNCTION), isActive, targetType (HTTP|MESSAGE|FUNCTION), nextRunAt, isRecurring, lastRun*, timestamps.
- **ChronoRun**: chronoId, scheduledFor, startedAt/finishedAt, status, httpStatus/responseSnippet/errorMessage, result, attempt, durationMs.
- **Channel**: metadados do provedor (inclui provider=WAHA, config.session, status).
- **Function**: code, runtime, limits (timeout/maxHttp/maxMessages/maxMemory), state, version/checksum, channelId opcional (fallback), timestamps.

## Cron e agendamento
- Expressão cron padrão ou linguagem natural:
  - `in 10 min`, `in 2 h`, `10 min`, `6h`
  - `todo dia as 08:00`, `daily at 07:30`
  - Puro cron: `0 8 * * *`
- One-shot (`in X min/h`) define `isRecurring=false` e desativa após rodar; recorrentes são reagendados automaticamente.

## Targets e comportamento
- **HTTP**: Axios com timeout configurável, aceita métodos em `ALLOWED_METHODS`; sucesso em 2xx/3xx; salva snippet/resposta/erro.
- **MESSAGE (WAHA)**: envia texto para `recipients` usando sessão definida no `Channel.config.session` (seed cria channel default). Status de sessão vem por webhook `POST /waha/webhooks/sessions/status` e atualiza `Channel.status`.
- **FUNCTION (CaaF)**:
  - Código salvo em `functions` e referenciado por `functionId`.
  - Sandbox em Worker Thread + vm, ctx congelado (sem require/process/fs), timeout hard e limite de memória.
  - Allowlist e rate-limit:
    - `ctx.http.*` só http/https; hosts permitidos via `FUNCTION_HTTP_ALLOWLIST`; rate-limit por segundo (`FUNCTION_RATE_LIMIT_PER_SECOND`).
    - `ctx.message.send` valida destinatário por prefixo (`FUNCTION_MESSAGE_RECIPIENT_ALLOWLIST`); usa channel do chrono ou da function.
  - SDK: `ctx.http.get/post/put/patch/delete`, `ctx.message.send({to,text})`, `ctx.state.get/set`, `ctx.log`, `ctx.sleep`, `ctx.env`.
  - State persiste em `functions.state`; logs retornam no `result`.

## Endpoints principais
- `POST /chronos` criar | `GET /chronos` listar | `GET /chronos/:id` detalhar | `PATCH /chronos/:id` atualizar | `DELETE /chronos/:id` remover.
- `POST /chronos/:id/pause` | `POST /chronos/:id/resume` | `POST /chronos/:id/trigger` (manual).
- `GET /chronos/:id/runs` histórico paginado (`skip`/`take`).
- WAHA: `/waha/sessions` CRUD/start/stop/logout/restart, QR em `/waha/sessions/:session/auth/qr`, webhook em `/waha/webhooks/sessions/status`.
- `GET /health` healthcheck.

### Como ativar a sessão WAHA
1. Suba os serviços (`docker compose up -d waha db redis api`).
2. Abra a dashboard do WAHA (porta 3001 do host, se exposta) e a sessão `default` já criada.
3. Leia/escaneie o QR em `/waha/sessions/default/auth/qr` para conectar o WhatsApp.
4. Configure manualmente na dashboard do WAHA o webhook de status apontando para sua API:  
   `POST http://<host>:3000/waha/webhooks/sessions/status`
5. Acompanhe `Channel.status` para ver o estado da sessão (SCAN_QR_CODE, CONNECTED, STOPPED, etc).

## Exemplos de criação
- HTTP one-shot em 10 min:
```json
{ "name": "Webhook teste", "cron": "in 10 min", "targetType": "HTTP", "url": "https://webhook.site/...", "method": "POST", "payload": { "hello": "world" }, "isActive": true }
```
- MESSAGE diária 08:00:
```json
{ "name": "Bom dia", "cron": "todo dia as 08:00", "targetType": "MESSAGE", "channelId": "<channel_waha>", "messageTemplate": "Bom dia!", "recipients": ["+5511999999999"], "isActive": true }
```
- FUNCTION diária 07:30:
```json
{
  "name": "Cobrança atrasados",
  "cron": "daily at 07:30",
  "targetType": "FUNCTION",
  "functionCode": "export default async function run(ctx){ const r = await ctx.http.get('https://api/users?overdue=true'); for(const u of r.data){ await ctx.message.send({to:u.phone,text:`Olá ${u.name}, sua fatura vence hoje`}); } ctx.state.set('count',(ctx.state.get('count')||0)+r.data.length); ctx.log('enviados', r.data.length); }",
  "functionLimits": { "timeoutMs": 10000, "maxHttp": 5, "maxMessages": 50 },
  "channelId": "<channel_waha>",
  "isActive": true
}
```

## Rodando com Docker
```bash
cp .env.example .env
docker compose up -d db redis waha
docker compose up --build api
# ou: docker compose up --build (tudo)
# API: http://localhost:3000 | Redis: 6379 | Postgres: 5432 | WAHA: 3001
# migrações (com containers ativos):
yarn migration:run
```

## Local (sem Docker)
```bash
yarn install
cp .env.example .env
yarn migration:run
yarn start:dev
```

## Variáveis de ambiente úteis
- `DATABASE_URL` (ex.: postgres://chrono:chrono@localhost:5432/chrono)
- `REDIS_URL` (ex.: redis://localhost:6379)
- `DEFAULT_TIMEZONE`
- `BULLMQ_ATTEMPTS`, `BULLMQ_BACKOFF_MS`
- `HTTP_REQUEST_TIMEOUT_MS`, `HTTP_MAX_RETRIES`
- `FUNCTION_HTTP_ALLOWLIST` (hosts separados por vírgula)
- `FUNCTION_MESSAGE_RECIPIENT_ALLOWLIST` (prefixos de telefone)
- `FUNCTION_RATE_LIMIT_PER_SECOND` (default 10)
- `WAHA_BASE_URL`, `WAHA_API_KEY`
- `PORT` (API, default 3000)

## Estrutura rápida
- `src/jobs/entities` (`Chrono`, `ChronoRun`, `UserFunction`)
- `src/jobs/scheduler.service.ts` (agendamento sem polling, 1 job/chrono)
- `src/jobs/processors/chrono.processor.ts` (executor BullMQ)
- `src/jobs/executors` (HTTP, MESSAGE, FUNCTION + worker)
- `src/waha` (sessões, webhooks, QR)
- `src/infrastructure/database/migrations` (migrations TypeORM)
- `docker-compose.yml` (API + Postgres + Redis + WAHA)
