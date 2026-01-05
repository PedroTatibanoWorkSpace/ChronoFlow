import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import axios from 'axios';
import { Worker } from 'worker_threads';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { Chrono } from '../entities/job.entity';
import { TargetExecutor, ExecutionResult } from './target-executor';
import { FunctionsRepository } from '../repositories/functions.repository';
import { ChannelRepository } from '../../messaging/repositories/channel.repository';
import { WahaService } from '../../waha/services/waha.service';

type FnLimits = {
  timeoutMs: number;
  maxHttp: number;
  maxMessages: number;
  maxMemoryMb: number;
};

type WorkerRequest =
  | { id: string; type: 'http'; payload: { method: string; url: string; body?: unknown; opts?: Record<string, unknown> } }
  | { id: string; type: 'message'; payload: { to: string; text: string; channelId?: string | null } };

type WorkerResponse =
  | { id: string; type: 'response'; ok: true; result: unknown }
  | { id: string; type: 'response'; ok: false; error: string }
  | { id: string; type: 'result'; ok: true; data: { logs: string[]; state: Record<string, unknown> | null } }
  | { id: string; type: 'error'; error: string };

@Injectable()
export class FunctionExecutor implements TargetExecutor {
  constructor(
    private readonly functionsRepo: FunctionsRepository,
    private readonly channels: ChannelRepository,
    private readonly waha: WahaService,
    private readonly config: ConfigService,
  ) {}

  supports(targetType: Chrono['targetType']): boolean {
    return targetType === 'FUNCTION';
  }

  async execute(chrono: Chrono): Promise<ExecutionResult> {
    const startedAt = Date.now();
    if (!chrono.functionId) {
      throw new NotFoundException('functionId is required for FUNCTION target');
    }

    const fn = await this.functionsRepo.findById(chrono.functionId);
    if (!fn) throw new NotFoundException(`Function ${chrono.functionId} not found`);
    if ((fn.runtime ?? 'vm') !== 'vm') {
      throw new BadRequestException(`Runtime ${fn.runtime} não suportado`);
    }

    const limits = this.parseLimits(fn.limits);
    const worker = new Worker(path.join(__dirname, 'function.worker.js'), {
      workerData: {
        code: fn.code,
        limits,
        state: fn.state ?? {},
        env: this.buildEnvWhitelist(),
      },
      resourceLimits: { maxOldGenerationSizeMb: limits.maxMemoryMb },
    });

    const axiosInstance = axios.create({
      timeout: limits.timeoutMs,
      validateStatus: () => true,
    });

    const httpAllowlist = this.loadHttpAllowlist();
    const messageAllowlist = this.loadMessageAllowlist();
    const perSecondLimit = this.config.get<number>('functionRateLimitPerSecond') ?? 10;
    let windowCount = 0;
    let windowStart = Date.now();
    let httpCount = 0;
    let messageCount = 0;

    const runPromise = new Promise<WorkerResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new InternalServerErrorException('Function timeout'));
      }, limits.timeoutMs);

      worker.on('message', async (msg: WorkerRequest | WorkerResponse) => {
        if ((msg as WorkerRequest).type === 'http' || (msg as WorkerRequest).type === 'message') {
          const req = msg as WorkerRequest;
          const id = req.id;
          try {
            if (req.type === 'http') {
              httpCount += 1;
              if (httpCount > limits.maxHttp) {
                throw new BadRequestException('Limite de HTTP requests excedido');
              }
              const { method, url, body, opts } = req.payload;
              this.assertHttpUrl(url, httpAllowlist);
              this.assertRate(
                () => {
                  if (Date.now() - windowStart >= 1000) {
                    windowStart = Date.now();
                    windowCount = 0;
                  }
                },
                () => {
                  windowCount += 1;
                  if (windowCount > perSecondLimit) {
                    throw new BadRequestException('Rate limit exceeded (per second)');
                  }
                },
              );
              const res = await axiosInstance.request({
                method,
                url,
                data: body,
                ...opts,
              });
              worker.postMessage({
                id,
                type: 'response',
                ok: true,
                result: { status: res.status, data: res.data },
              } as WorkerResponse);
            } else if (req.type === 'message') {
              messageCount += 1;
              if (messageCount > limits.maxMessages) {
                throw new BadRequestException('Limite de mensagens excedido');
              }
              const sessionChannelId = req.payload.channelId ?? chrono.channelId ?? fn.channelId;
              if (!sessionChannelId) {
                throw new BadRequestException('channelId required to send messages');
              }
              const channel = await this.channels.findById(sessionChannelId);
              if (!channel) {
                throw new NotFoundException(`Channel ${sessionChannelId} not found`);
              }
              const session = (
                (channel.config?.session as string | undefined) ?? 'default'
              ).toLowerCase();
              this.assertRecipient(req.payload.to, messageAllowlist);
              this.assertRate(
                () => {
                  if (Date.now() - windowStart >= 1000) {
                    windowStart = Date.now();
                    windowCount = 0;
                  }
                },
                () => {
                  windowCount += 1;
                  if (windowCount > perSecondLimit) {
                    throw new BadRequestException('Rate limit exceeded (per second)');
                  }
                },
              );
              const res = await this.waha.sendTextMessage(session, req.payload.to, req.payload.text);
              worker.postMessage({
                id,
                type: 'response',
                ok: true,
                result: { status: res.status, data: res.data },
              } as WorkerResponse);
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            worker.postMessage({
              id,
              type: 'response',
              ok: false,
              error: message,
            } as WorkerResponse);
          }
          return;
        }

        const resMsg = msg as WorkerResponse;
        if (resMsg.type === 'result') {
          clearTimeout(timeout);
          resolve(resMsg);
          return;
        }
        if (resMsg.type === 'error') {
          clearTimeout(timeout);
          reject(new InternalServerErrorException(resMsg.error));
          return;
        }
        // 'response' messages are handled inside waiters on the worker side; ignore here
      });

      worker.on('error', (err) => {
        clearTimeout(timeout);
        reject(new InternalServerErrorException(`Function worker error: ${err.message}`));
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          clearTimeout(timeout);
          reject(new InternalServerErrorException(`Function worker exited with code ${code}`));
        }
      });
    });

    try {
      const result = await runPromise;
      if (result.type === 'result' && result.ok) {
        await this.functionsRepo.save({ ...fn, state: result.data.state ?? {} });
        return {
          status: 'SUCCESS',
          result: { logs: result.data.logs },
          durationMs: Date.now() - startedAt,
        };
      }
      throw new InternalServerErrorException('Function run did not return result');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Function execution error';
      throw new InternalServerErrorException(message);
    }
  }

  private parseLimits(limits: Record<string, unknown> | null | undefined): FnLimits {
    return {
      timeoutMs:
        typeof limits?.timeoutMs === 'number' && limits.timeoutMs > 0
          ? limits.timeoutMs
          : 10000,
      maxHttp:
        typeof limits?.maxHttp === 'number' && limits.maxHttp > 0
          ? limits.maxHttp
          : 10,
      maxMessages:
        typeof limits?.maxMessages === 'number' && limits.maxMessages > 0
          ? limits.maxMessages
          : 20,
      maxMemoryMb:
        typeof limits?.maxMemoryMb === 'number' && limits.maxMemoryMb > 0
          ? limits.maxMemoryMb
          : 128,
    };
  }

  private buildEnvWhitelist(): Record<string, string> {
    const allow = this.config.get<string[]>('functionEnvAllowlist') ?? [];
    const env: Record<string, string> = {};
    for (const key of allow) {
      const val = process.env[key];
      if (val !== undefined) env[key] = val;
    }
    return env;
  }

  private loadHttpAllowlist(): string[] {
    return this.config
      .get<string[]>('functionHttpAllowlist')
      ?.map((h) => h.toLowerCase().trim())
      .filter(Boolean) ?? [];
  }

  private loadMessageAllowlist(): string[] {
    return this.config
      .get<string[]>('functionMessageRecipientAllowlist')
      ?.map((h) => h.trim())
      .filter(Boolean) ?? [];
  }

  private assertRecipient(recipient: string, allowlist: string[]) {
    if (!allowlist.length) return;
    const ok = allowlist.some((prefix) => recipient.startsWith(prefix));
    if (!ok) {
      throw new BadRequestException(`Recipient not allowed: ${recipient}`);
    }
  }

  private assertHttpUrl(url: string, allowlist: string[]) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Only http/https allowed');
      }
      if (allowlist.length) {
        const host = parsed.hostname.toLowerCase();
        if (!allowlist.includes(host)) {
          throw new Error('Host not allowed');
        }
      }
    } catch {
      throw new BadRequestException(`HTTP host not allowed: ${url}`);
    }
  }

  private assertRate(resetWindow: () => void, bump: () => void) {
    resetWindow();
    bump();
  }
}
