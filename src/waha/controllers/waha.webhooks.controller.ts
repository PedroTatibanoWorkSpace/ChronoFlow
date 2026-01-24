import { Body, Controller, Post } from '@nestjs/common';
import { ChannelRepository } from '../../messaging/repositories/channel.repository';

interface WahaNestedPayload {
  session?: string;
  name?: string;
  status?: string;
}

interface WahaWebhookPayload {
  session?: string;
  status?: string;
  state?: string;
  data?: WahaNestedPayload;
  payload?: WahaNestedPayload;
}

@Controller('waha/webhooks')
export class WahaWebhooksController {
  constructor(private readonly channels: ChannelRepository) {}

  @Post('sessions/status')
  async handleSessionStatus(@Body() payload: WahaWebhookPayload) {
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

  private extractSession(payload: WahaWebhookPayload): string | null {
    const s =
      payload.session ??
      payload.data?.session ??
      payload.payload?.name ??
      'default';

    if (typeof s !== 'string') return null;

    const out = s.trim().toLowerCase();
    return out || null;
  }

  private extractStatus(payload: WahaWebhookPayload): string | null {
    const s =
      payload.status ??
      payload.data?.status ??
      payload.payload?.status ??
      payload.state;

    return typeof s === 'string' ? s.trim() : null;
  }
}
