export const configuration = () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  bullPrefix: process.env.BULLMQ_PREFIX ?? 'chrono',
  bullAttempts: parseInt(process.env.BULLMQ_ATTEMPTS ?? '3', 10),
  bullBackoffMs: parseInt(process.env.BULLMQ_BACKOFF_MS ?? '5000', 10),
  defaultTimezone: process.env.DEFAULT_TIMEZONE ?? 'UTC',
  httpRequestTimeoutMs: parseInt(
    process.env.HTTP_REQUEST_TIMEOUT_MS ?? '10000',
    10,
  ),
  httpMaxRetries: parseInt(process.env.HTTP_MAX_RETRIES ?? '3', 10),
  schedulerIntervalMs: parseInt(
    process.env.SCHEDULER_INTERVAL_MS ?? '30000',
    10,
  ),
});
