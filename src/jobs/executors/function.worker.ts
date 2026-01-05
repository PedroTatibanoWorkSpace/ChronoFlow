import { parentPort, workerData } from 'worker_threads';
import vm from 'vm';
import { v4 as uuid } from 'uuid';

const MAX_LOG_ENTRIES = 200;
const MAX_LOG_LENGTH = 1000;
const MAX_STATE_BYTES = 10000;

type WorkerRequest =
  | { id: string; type: 'http'; payload: { method: string; url: string; body?: unknown; opts?: Record<string, unknown> } }
  | { id: string; type: 'message'; payload: { to: string; text: string; channelId?: string | null } };

type WorkerResponse =
  | { id: string; type: 'response'; ok: true; result: unknown }
  | { id: string; type: 'response'; ok: false; error: string }
  | { id: string; type: 'result'; ok: true; data: { logs: string[]; state: Record<string, unknown> | null } }
  | { id: string; type: 'error'; error: string };

const send = (msg: WorkerRequest | WorkerResponse) => {
  parentPort?.postMessage(msg);
};

const waitResponse = (id: string) =>
  new Promise<WorkerResponse>((resolve) => {
    const listener = (msg: WorkerResponse | WorkerRequest) => {
      if ((msg as WorkerResponse).type === 'response' && (msg as WorkerResponse).id === id) {
        parentPort?.off('message', listener);
        resolve(msg as WorkerResponse);
      }
    };
    parentPort?.on('message', listener);
  });

const requestHttp = async (method: string, url: string, body?: unknown, opts?: Record<string, unknown>) => {
  const id = uuid();
  send({ id, type: 'http', payload: { method, url, body, opts } });
  const res = await waitResponse(id);
  if (res.type !== 'response' || !res.ok) throw new Error((res as any).error ?? 'Request failed');
  return (res as any).result;
};

const requestMessage = async (payload: { to: string; text: string; channelId?: string | null }) => {
  const id = uuid();
  send({ id, type: 'message', payload });
  const res = await waitResponse(id);
  if (res.type !== 'response' || !res.ok) throw new Error((res as any).error ?? 'Request failed');
  return (res as any).result;
};

const logs: string[] = [];

const pushLog = (args: unknown[]) => {
  if (logs.length >= MAX_LOG_ENTRIES) return;
  const entry = args.map((a) => String(a)).join(' ');
  logs.push(entry.slice(0, MAX_LOG_LENGTH));
};

const safeConsole = {
  log: (...args: unknown[]) => pushLog(args),
  warn: (...args: unknown[]) => pushLog(args),
  error: (...args: unknown[]) => pushLog(args),
};

const stateStore: Record<string, unknown> = { ...(workerData.state ?? {}) };

const ctx = Object.freeze({
  http: Object.freeze({
    get: (url: string, opts?: Record<string, unknown>) => requestHttp('get', url, undefined, opts),
    post: (url: string, body?: unknown, opts?: Record<string, unknown>) =>
      requestHttp('post', url, body, opts),
    put: (url: string, body?: unknown, opts?: Record<string, unknown>) => requestHttp('put', url, body, opts),
    patch: (url: string, body?: unknown, opts?: Record<string, unknown>) =>
      requestHttp('patch', url, body, opts),
    delete: (url: string, opts?: Record<string, unknown>) => requestHttp('delete', url, undefined, opts),
  }),
  message: Object.freeze({
    send: ({ to, text, channelId }: { to: string; text: string; channelId?: string | null }) =>
      requestMessage({ to, text, channelId }),
  }),
  state: Object.freeze({
    get: <T = unknown>(key: string): T | undefined => stateStore[key] as T,
    set: (key: string, value: unknown) => {
      const size = (() => {
        try {
          return JSON.stringify(value)?.length ?? 0;
        } catch {
          return MAX_STATE_BYTES + 1;
        }
      })();
      if (size > MAX_STATE_BYTES) {
        throw new Error('Estado excede o limite permitido');
      }
      stateStore[key] = value;
    },
  }),
  log: (...args: unknown[]) => safeConsole.log(...args),
  sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms))),
  env: (key: string) => (workerData.env?.[key] as string | undefined),
});

const sandbox = vm.createContext({
  ctx,
  console: safeConsole,
  setTimeout,
  clearTimeout,
  AbortController,
  URL,
  module: { exports: {} },
  exports: {},
});

const wrapCode = (code: string) => `
  "use strict";
  let _default = null;
  const exports = {};
  (function() {
    ${code}
    if (typeof module !== 'undefined' && module.exports) { _default = module.exports.default || module.exports; }
    else if (typeof exports !== 'undefined' && exports.default) { _default = exports.default; }
    else if (typeof run === 'function') { _default = run; }
  })();
  if (typeof _default !== 'function') {
    throw new Error("No exported function found");
  }
  _default;
`;

const run = async () => {
  try {
    const script = new vm.Script(wrapCode(workerData.code), { filename: 'function.js' });
    const fn = script.runInContext(sandbox, { timeout: workerData.limits.timeoutMs });
    await fn(ctx);
    send({ id: 'result', type: 'result', ok: true, data: { logs, state: stateStore } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Execution error';
    send({ id: 'error', type: 'error', error: msg });
  }
};

run();
