import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { Chrono } from '../entities/job.entity';
import { ExecutionResult, TargetExecutor } from './target-executor';

@Injectable()
export class HttpExecutor implements TargetExecutor {
  private readonly logger = new Logger(HttpExecutor.name);

  constructor(private readonly configService: ConfigService) {}

  supports(targetType: Chrono['targetType']): boolean {
    return targetType === 'HTTP';
  }

  async execute(chrono: Chrono): Promise<ExecutionResult> {
    const startedAt = Date.now();
    try {
      const response = await axios.request({
        method: chrono.method,
        url: chrono.url,
        data: chrono.payload ?? undefined,
        headers: chrono.headers ?? undefined,
        timeout:
          this.configService.get<number>('httpRequestTimeoutMs') ?? 10000,
        validateStatus: () => true,
      });

      const status: ExecutionResult['status'] =
        response.status >= 200 && response.status < 400 ? 'SUCCESS' : 'FAILED';

      return {
        status,
        httpStatus: response.status,
        responseSnippet: this.stringifySnippet(response.data),
        errorMessage: status === 'FAILED' ? 'HTTP status not OK' : null,
        result: this.safeJson(response.data),
        durationMs: Date.now() - startedAt,
      };
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.message
        : ((err as Error).message ?? 'Unknown error');
      this.logger.error(
        `HTTP execution failed for chrono ${chrono.id}`,
        err instanceof Error ? err.stack : String(err),
      );
      return {
        status: 'FAILED',
        httpStatus: null,
        responseSnippet: null,
        errorMessage: message,
        result: null,
        durationMs: Date.now() - startedAt,
      };
    }
  }

  private stringifySnippet(data: unknown): string {
    try {
      const serialized = typeof data === 'string' ? data : JSON.stringify(data);
      return serialized.slice(0, 1000);
    } catch {
      return 'Unable to serialize response';
    }
  }

  private safeJson(data: unknown): unknown {
    try {
      // Ensure data is JSON-serializable for the jsonb column.
      return JSON.parse(JSON.stringify(data));
    } catch {
      return { message: 'Unable to serialize response data' };
    }
  }
}
