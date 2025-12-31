import { Body, Controller, Post } from '@nestjs/common';
import { ChannelRepository } from '../../messaging/repositories/channel.repository';

@Controller('waha/webhooks')
export class WahaWebhooksController {
  constructor(private readonly channels: ChannelRepository) {}

  @Post('sessions/status')
  async handleSessionStatus(@Body() payload: Record<string, unknown>) {
    const sessionName = this.extractSession(payload);
    const status = this.extractStatus(payload);

    const channel = sessionName
      ? await this.channels.findByProviderAndSession('WAHA', sessionName)
      : null;

    if (!channel) {
      return {
        updated: false,
        reason: 'channel not found for WAHA session',
        session: sessionName ?? 'unknown',
      };
    }

    if (!status) {
      return {
        updated: false,
        reason: 'missing status field',
        session: sessionName,
      };
    }

    const updated = await this.channels.updateStatus(channel.id, status);

    return {
      updated: Boolean(updated),
      channelId: channel.id,
      session: sessionName,
      status,
    };
  }

  private extractSession(payload: Record<string, unknown>): string | null {
    const s =
      (payload.session as string) ??
      (payload.data as any)?.session ??
      (payload.payload as any)?.name ??
      'default';

    if (typeof s !== 'string') return null;

    const out = s.trim().toLowerCase();
    return out || null;
  }

  private extractStatus(payload: Record<string, unknown>): string | null {
    const s =
      (payload.status as string) ??
      (payload.data as any)?.status ??
      (payload.payload as any)?.status ??
      (payload.state as string);

    return typeof s === 'string' ? s.trim() : null;
  }
}
