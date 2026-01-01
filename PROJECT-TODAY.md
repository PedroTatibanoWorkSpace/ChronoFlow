# ChronoFlow — Visão Atual

Orquestrador/scheduler em NestJS + BullMQ para disparar webhooks e mensagens WhatsApp (WAHA) no horário certo, registrando histórico de execuções.

## Stack e Infra
- NestJS 11, TypeORM (PostgreSQL), BullMQ (Redis), Axios e Luxon.
- Config centralizada via `ConfigModule` (`src/infrastructure/config`), lendo `.env`.
- Docker Compose sobe API (dev), Postgres, Redis e WAHA (WhatsApp HTTP API); volumes `waha-sessions` e `waha-media` persistem dados do WAHA.

## Domínio e Dados
- Entidades: `Chrono` (job agendado), `ChronoRun` (execução/histórico), `Channel` (metadados de canal de mensagem).
- Campos principais de `Chrono`: nome/descrição, `cron`, `timezone`, `method`, `url`, `headers/payload`, `isActive`, `targetType` (`HTTP` e `MESSAGE`), `config`, `channelId`, `messageTemplate`, `recipients`, `lastRun*`, `nextRunAt`.
- Campos de `ChronoRun`: `chrono_id`, `scheduled_for`, `started_at/finished_at`, `status`, `http_status`, `response_snippet`, `error_message`, `result`, `attempt`, `duration_ms`.

## Fluxo Atual
1) **Cadastro/edição de chrono** (`POST/PATCH /chronos`): valida target (HTTP ou MESSAGE), defaults de timezone/método. Normaliza cron com linguagem natural (`in 10 min`, `6h`, `todo dia as 08:00`) ou expressão padrão e calcula `nextRunAt`; aceita one-shot (`in X min/h`) ou recorrente.
2) **Agendamento sem polling** (`SchedulerService`): cada chrono ativo mantém exatamente 1 job atrasado no BullMQ (`chrono-executions`) com `jobId` fixo `chrono-{id}`. Ao iniciar a aplicação carrega os cronos ativos e agenda com delay até `nextRunAt`; atualizações/pausas/remover reprogramam/removem esse job.
3) **Execução** (`ChronoProcessor`): consome `execute-chrono`, marca início/tentativa, delega ao executor pelo `targetType`, grava `chrono_run` (status/métricas/resposta) e atualiza o `Chrono` com `lastRun*`. Ao terminar, agenda o próximo run se for recorrente; one-shot desativa e remove da fila. Erros ainda respeitam `attempts/backoff`.
4) **Trigger manual** (`POST /chronos/:id/trigger`): cria run imediato e envia à fila; não agenda próximo automaticamente (manual).
5) **Cron-as-a-Function**: além de HTTP/MESSAGE, o alvo pode ser `FUNCTION`, apontando para uma função salva (tabela `functions`) que roda em sandbox (`vm`) com SDK seguro (`ctx.http`, `ctx.message`, `ctx.state`, `ctx.log`, `ctx.sleep`, `ctx.env`). Limites por run (timeout, maxHttp, maxMessages) aplicados.

### Exemplos de criação de chrono
- HTTP one-shot em 10 minutos:
```json
POST /chronos
{
  "name": "Webhook teste",
  "cron": "in 10 min",
  "targetType": "HTTP",
  "url": "https://webhook.site/seu-endpoint",
  "method": "POST",
  "payload": { "hello": "world" },
  "headers": { "X-Trace": "123" },
  "isActive": true
}
```
- MESSAGE recorrente todo dia às 08:00:
```json
POST /chronos
{
  "name": "Bom dia clientes",
  "cron": "todo dia as 08:00",
  "targetType": "MESSAGE",
  "channelId": "<id do channel WAHA>",
  "messageTemplate": "Bom dia! Promo de hoje...",
  "recipients": ["+5511999999999", "+5511888888888"],
  "isActive": true
}
```
- FUNCTION diário: código salvo inline (se quiser referenciar já salvo, use `functionId`)
```json
POST /chronos
{
  "name": "Cobrança atrasados",
  "cron": "daily at 07:30",
  "targetType": "FUNCTION",
  "functionCode": "export default async function run(ctx){ const r = await ctx.http.get('https://api.internal/users?overdue=true'); for (const u of r.data){ await ctx.message.send({ to: u.phone, text: `Olá ${u.name}, sua fatura vence hoje` }); } ctx.state.set('lastCount', (ctx.state.get('lastCount')||0)+r.data.length); ctx.log('enviados', r.data.length); }",
  "functionLimits": { "timeoutMs": 10000, "maxHttp": 5, "maxMessages": 50 },
  "channelId": "<id do channel WAHA>",  // usado pelo ctx.message
  "extras": { "segment": "overdue" },
  "isActive": true
}
```

## Executor HTTP (implementado)
- Axios com timeout configurável (`HTTP_REQUEST_TIMEOUT_MS`), aceita métodos em `ALLOWED_METHODS`.
- `status` de sucesso se HTTP 2xx/3xx; salva snippet da resposta (1000 chars), `httpStatus`, `errorMessage` quando não-OK, `result` serializado e `durationMs`.

## Mensageria (WAHA)
- `targetType=MESSAGE` validado (exige `channelId`, `messageTemplate`, `recipients`); executor usa WAHA (`/api/sendText`) para disparar texto por sessão configurada no `Channel`.
- `Channel` ganhou coluna `status` para refletir status da sessão WAHA; webhooks de sessão atualizam.
- Seed disponível para criar canal padrão WAHA (sessão `default`) via `yarn seed:run`.
### Fluxo MESSAGE com WAHA
1. Criar Channel provider `WAHA` com `config.session = "default"` (seed já cria).
2. Garantir sessão WAHA `default` ativa (scan QR em `/waha/sessions/default/auth/qr`).
3. Criar chrono `targetType=MESSAGE` apontando para o channel.
4. Scheduler agenda run; executor chama WAHA `POST /api/sendText` com `{session: "default", chatId: "<numero>@c.us", text}` para cada recipient.
5. Webhook de status de sessão WAHA (`POST /waha/webhooks/sessions/status`) atualiza `Channel.status`.

## Cron-as-a-Function (CaaF)
- **Para que serve**: permite escrever lógica arbitrária (loops, decisões) que roda no horário do cron, usando SDK seguro para HTTP e WhatsApp. O ChronoFlow vira motor de automação, não só scheduler de payload fixo.
- **Armazenamento**: tabela `functions` guarda `code`, `runtime` (vm), `limits` (timeout, maxHttp, maxMessages), `state` (json), `version/checksum`, opcional `channel_id`. `chronos` referencia via `functionId` e pode carregar `extras` (json) específico do agendamento.
- **SDK disponível no código**:
  - `ctx.http.get|post|put|patch|delete(url, opts?)` — só http/https; conta para `maxHttp`.
  - `ctx.message.send({ to, text })` — usa channel do chrono ou da function; respeita `maxMessages`.
  - `ctx.state.get/set` — estado persistente por função salvo em `functions.state`.
  - `ctx.log(...)` — guarda logs no run.
  - `ctx.sleep(ms)` — delay cooperativo.
  - `ctx.env(key)` — lê variáveis de ambiente (whitelist implícita).
- **Segurança**: sandbox `vm` sem `require/process/fs`, timeout por run, limites de chamadas HTTP/mensagem, URLs apenas http/https.
- **Uso**: criar `function` inline via `functionCode` em `/chronos` ou referenciar uma existente (`functionId`). Scheduler agenda normal; processor executa sandbox e salva `state`/logs no run (em `result`).

## WAHA (WhatsApp HTTP API)
- Módulo `src/waha` expõe rotas `/waha/sessions` para listar/criar/atualizar/deletar/start/stop/logout/restart sessões, ver QR e solicitar código. Usa Axios configurado com `WAHA_BASE_URL` e `WAHA_API_KEY`.
### Rotas principais WAHA usadas
- `GET /waha/sessions/:session/auth/qr`: retorna QR (stream PNG/base64 fallback) para pareamento.
- `POST /waha/sessions/:session/start|stop|logout|restart`: controla a sessão.
- `POST /waha/webhooks/sessions/status`: recebe eventos `session.status` (atualiza `Channel.status`).
- Envio de mensagem via WAHA interno: `POST /api/sendText` (chamado pelo executor MESSAGE).

## API Principal
- `POST /chronos` criar | `GET /chronos` listar | `GET /chronos/:id` detalhar | `PATCH /chronos/:id` atualizar | `DELETE /chronos/:id` remover.
- `POST /chronos/:id/pause` | `POST /chronos/:id/resume` | `POST /chronos/:id/trigger`.
- `GET /chronos/:id/runs` histórico paginado (`skip`/`take`).
- `GET /health` healthcheck.

## Ambiente e Execução
- Docker: `cp .env.example .env && docker compose up --build`, depois `yarn migration:run` com containers ativos. Porta API: 3000, Redis: 6379, Postgres: 5432, WAHA: 3001.
- Local sem Docker: `yarn install`, copiar `.env.example`, `yarn migration:run`, `yarn start:dev`.

## Estado Atual e Gaps
- HTTP e MESSAGE executores funcionando; WAHA depende do provider responder 2xx (erros 4xx/429 do endpoint externo marcam run como FAILED).
- Scheduler agora event-driven (sem polling fixo); dedup via `jobId` por chrono.
- Observabilidade básica (logs Nest). Métricas e logs estruturados pendentes.
- Testes e2e ainda em scaffold (espera “Hello World!”).
