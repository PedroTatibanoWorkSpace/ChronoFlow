# ChronoFlow

Automation and scheduling engine (**NestJS + BullMQ**) that triggers:

* **HTTP** webhooks
* **MESSAGE** via **WAHA** (WhatsApp HTTP API)
* **FUNCTION** (*Cron-as-a-Function*) with secure sandbox and SDK for HTTP/WAHA/state

Logs execution history and keeps **one job per chrono**, without heavy polling.

---

## ✨ What you get

* ⏱ **Event-driven** scheduler (1 delayed job per chrono)
* 🔁 Recurrence and one-shot (auto-disables after running)
* 🚀 Manual trigger for immediate runs
* 📊 Auditable history via `ChronoRun` (status, error, duration, snippet)
* 🔐 User functions in **sandbox** with limits (timeout/memory) and allowlist
* 📲 Real WhatsApp integration (WAHA) + status webhook

---

## ⚡ Quickstart (run everything with Docker)

```bash
cp .env.example .env

docker compose up -d db redis waha
# build and start API
docker compose up --build api

# migrations (with containers running):
yarn migration:run

# API:   http://localhost:3000
# WAHA:  http://localhost:3001 (if exposed)
# Redis: localhost:6379
# Pg:    localhost:5432
```

> Tip: if you want to start everything at once:
>
> ```bash
> docker compose up --build
> ```

---

## ✅ Step by step: enable WhatsApp (WAHA) with status webhook

MESSAGE integration depends on a **connected WAHA session** and the **status webhook** configured.

### 1) Start the services

```bash
docker compose up -d db redis waha
docker compose up --build api
```

### 2) Confirm API and WAHA are reachable

* API: `http://localhost:3000/health`
* WAHA (dashboard): `http://localhost:3001` (if exposed)

### 3) Create (or use) a session

The seed creates a default session (e.g. `default`) in `Channel`, but you can manage sessions via the API.

Example (create/start session):

```bash
# depending on your project, it can be POST/PUT — adjust to your route
curl -X POST http://localhost:3000/waha/sessions/default/start
```

### 4) Get the QR and connect WhatsApp

Open the QR:

* `GET /waha/sessions/default/auth/qr`

Example:

```bash
curl http://localhost:3000/waha/sessions/default/auth/qr
```

Scan with WhatsApp (linked devices).

### 5) Configure the webhook **manually in the WAHA dashboard**

This step is **required** to keep `Channel.status` updated automatically.

1. Open the **WAHA dashboard**: `http://localhost:3001`
2. Find **Webhooks** / **Callbacks** / **Session status webhook** settings (name varies by version)
3. Configure the endpoint:

```
POST http://<YOUR_API_HOST>:3000/waha/webhooks/sessions/status
```

✅ Examples of `YOUR_API_HOST`:

* Running locally on host: `http://localhost:3000/...`
* Running everything via docker (same network) and configuring from WAHA: use the service name (e.g. `http://api:3000/...`) if the dashboard supports it.
* Running on VM/server: use the internal public IP/DNS.

> **Attention**: if WAHA is in a container and you use `localhost`, it points to the container itself. In those cases use `http://api:3000/...` (service name) or the host IP.

### 6) Check session status

After configuring the webhook and scanning the QR, `Channel.status` should move to something like `WORKING`.

If it does not update:

* check `api` container logs
* check that WAHA can reach the webhook URL

---

## Stack and modules

* NestJS 11, TypeORM (PostgreSQL), BullMQ (Redis), Axios, Luxon.
* Event-driven scheduler (`SchedulerService`): keeps 1 delayed job per chrono; reschedules on completion and disables one-shot.
* Workers (`ChronoProcessor`): execute based on `targetType`.
* WAHA integrated (service in docker-compose).
* Functions in sandbox (Worker Thread + vm, frozen ctx, timeout/heap limit, allowlist).

---

## Data models (main)

* **Chrono**: id, name/description, cron, timezone, method/url/headers/payload (HTTP), channelId/messageTemplate/recipients (MESSAGE), functionId/extras (FUNCTION), isActive, targetType (HTTP|MESSAGE|FUNCTION), nextRunAt, isRecurring, lastRun*, timestamps.
* **ChronoRun**: chronoId, scheduledFor, startedAt/finishedAt, status, httpStatus/responseSnippet/errorMessage, result, attempt, durationMs.
* **Channel**: provider metadata (includes provider=WAHA, config.session, status).
* **Function**: code, runtime, limits (timeout/maxHttp/maxMessages/maxMemory), state, version/checksum, optional channelId (fallback), timestamps.

---

## Cron and scheduling

* Standard cron expression or natural language:

  * `in 10 min`, `in 2 h`, `10 min`, `6h`
  * `every day at 08:00`, `daily at 07:30`
  * Pure cron: `0 8 * * *`
* One-shot (`in X min/h`) sets `isRecurring=false` and auto-disables after running; recurring runs are rescheduled automatically.

---

## Targets and behavior

### HTTP

* Axios with configurable timeout
* Accepts methods in `ALLOWED_METHODS`
* Success on 2xx/3xx
* Stores snippet/response/error

### MESSAGE (WAHA)

* Sends text to `recipients` using session defined in `Channel.config.session`
* Session status comes via webhook `POST /waha/webhooks/sessions/status` and updates `Channel.status`

### FUNCTION (CaaF)

* Code stored in `functions` and referenced by `functionId`
* Sandbox in Worker Thread + vm, frozen ctx (no require/process/fs)
* Hard timeout and memory limit

Allowlist and rate-limit:

* `ctx.http.*` only http/https; allowed hosts via `FUNCTION_HTTP_ALLOWLIST`; rate-limit per second (`FUNCTION_RATE_LIMIT_PER_SECOND`)
* `ctx.message.send` validates recipient by prefix (`FUNCTION_MESSAGE_RECIPIENT_ALLOWLIST`); uses chrono or function channel

SDK available:

* `ctx.http.get/post/put/patch/delete`
* `ctx.message.send({to,text})`
* `ctx.state.get/set`
* `ctx.log`, `ctx.sleep`, `ctx.env`

State persists in `functions.state`; logs return in `result`.

---

## Main endpoints

* `POST /chronos` create | `GET /chronos` list | `GET /chronos/:id` detail | `PATCH /chronos/:id` update | `DELETE /chronos/:id` remove.
* `POST /chronos/:id/pause` | `POST /chronos/:id/resume` | `POST /chronos/:id/trigger` (manual).
* `GET /chronos/:id/runs` paginated history (`skip`/`take`).
* WAHA: `/waha/sessions` CRUD/start/stop/logout/restart, QR at `/waha/sessions/:session/auth/qr`, webhook at `/waha/webhooks/sessions/status`.
* `GET /health` healthcheck.

---

## Creation examples

### HTTP one-shot in 10 min

```json
{ "name": "Test webhook", "cron": "in 10 min", "targetType": "HTTP", "url": "https://webhook.site/...", "method": "POST", "payload": { "hello": "world" }, "isActive": true }
```

### MESSAGE daily 08:00

```json
{ "name": "Good morning", "cron": "every day at 08:00", "targetType": "MESSAGE", "channelId": "<channel_waha>", "messageTemplate": "Good morning!", "recipients": ["+5511999999999"], "isActive": true }
```

### FUNCTION daily 07:30

```json
{
  "name": "Overdue reminders",
  "cron": "daily at 07:30",
  "targetType": "FUNCTION",
  "functionCode": "export default async function run(ctx){ const r = await ctx.http.get('https://api/users?overdue=true'); for(const u of r.data){ await ctx.message.send({to:u.phone,text:`Hello ${u.name}, your invoice is due today`}); } ctx.state.set('count',(ctx.state.get('count')||0)+r.data.length); ctx.log('sent', r.data.length); }",
  "functionLimits": { "timeoutMs": 10000, "maxHttp": 5, "maxMessages": 50 },
  "channelId": "<channel_waha>",
  "isActive": true
}
```

---

## Local (without Docker)

```bash
yarn install
cp .env.example .env
yarn migration:run
yarn start:dev
```

---

## Useful environment variables

* `DATABASE_URL` (e.g. postgres://chrono:chrono@localhost:5432/chrono)
* `REDIS_URL` (e.g. redis://localhost:6379)
* `DEFAULT_TIMEZONE`
* `BULLMQ_ATTEMPTS`, `BULLMQ_BACKOFF_MS`
* `HTTP_REQUEST_TIMEOUT_MS`, `HTTP_MAX_RETRIES`
* `FUNCTION_HTTP_ALLOWLIST` (comma-separated hosts)
* `FUNCTION_MESSAGE_RECIPIENT_ALLOWLIST` (phone prefixes)
* `FUNCTION_RATE_LIMIT_PER_SECOND` (default 10)
* `WAHA_BASE_URL`, `WAHA_API_KEY`
* `PORT` (API, default 3000)

---

## Quick structure

* `src/jobs/entities` (`Chrono`, `ChronoRun`, `UserFunction`)
* `src/jobs/scheduler.service.ts` (no-poll scheduling, 1 job/chrono)
* `src/jobs/processors/chrono.processor.ts` (BullMQ executor)
* `src/jobs/executors` (HTTP, MESSAGE, FUNCTION + worker)
* `src/waha` (sessions, webhooks, QR)
* `src/infrastructure/database/migrations` (TypeORM migrations)
* `docker-compose.yml` (API + Postgres + Redis + WAHA)
