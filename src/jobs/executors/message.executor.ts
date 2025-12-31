import { Injectable, NotFoundException } from '@nestjs/common';
import { Chrono } from '../entities/job.entity';
import { ExecutionResult, TargetExecutor } from './target-executor';
import { WahaService } from '../../waha/services/waha.service';
import { ChannelRepository } from '../../messaging/repositories/channel.repository';

@Injectable()
export class MessageExecutor implements TargetExecutor {
  constructor(
    private readonly waha: WahaService,
    private readonly channels: ChannelRepository,
  ) {}

  supports(targetType: Chrono['targetType']): boolean {
    return targetType === 'MESSAGE';
  }

  async execute(chrono: Chrono): Promise<ExecutionResult> {
    const startedAt = Date.now();
    if (!chrono.channelId) {
      throw new NotFoundException('channelId is required for MESSAGE target');
    }
    const channel = await this.channels.findById(chrono.channelId);
    if (!channel) {
      throw new NotFoundException(
        `Channel ${chrono.channelId} not found for MESSAGE target`,
      );
    }

    const session = (
      (channel.config?.session as string | undefined) ?? 'default'
    ).toLowerCase();
    const recipients = chrono.recipients ?? [];
    const text = chrono.messageTemplate ?? '';

    const results: Array<{
      to: string;
      status: 'SUCCESS' | 'FAILED';
      response?: unknown;
      error?: string;
    }> = [];

    for (const to of recipients) {
      try {
        const response = await this.waha.sendTextMessage(session, to, text);
        const ok = response.status >= 200 && response.status < 300;
        results.push({
          to,
          status: ok ? 'SUCCESS' : 'FAILED',
          response: response.data,
          error: ok ? undefined : 'HTTP status not OK',
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown send error';
        results.push({ to, status: 'FAILED', error: message });
      }
    }

    const allSucceeded = results.every((r) => r.status === 'SUCCESS');

    return {
      status: allSucceeded ? 'SUCCESS' : 'FAILED',
      httpStatus: null,
      responseSnippet: null,
      errorMessage: allSucceeded
        ? null
        : 'One or more recipients failed to send',
      result: { session, results },
      durationMs: Date.now() - startedAt,
    };
  }
}
