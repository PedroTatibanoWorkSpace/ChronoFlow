import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class WahaService {
  private readonly client: AxiosInstance;

  constructor(private readonly config: ConfigService) {
    const baseURL = this.config.get<string>('wahaBaseUrl');
    const apiKey = this.config.get<string>('wahaApiKey');

    if (!baseURL) {
      throw new BadRequestException('WAHA_BASE_URL is not configured');
    }
    if (!apiKey) {
      throw new BadRequestException('WAHA_API_KEY is not configured');
    }

    this.client = axios.create({
      baseURL,
      headers: {
        'X-API-KEY': apiKey,
      },
      timeout: 15000,
    });
  }

  async listSessions() {
    const { data } = await this.client.get('/api/sessions');
    return data;
  }

  async createSession(payload: unknown) {
    const { data } = await this.client.post('/api/sessions', payload);
    return data;
  }

  async getSession(session: string) {
    const { data } = await this.client.get(`/api/sessions/${session}`);
    return data;
  }

  async updateSession(session: string, payload: unknown) {
    const { data } = await this.client.put(
      `/api/sessions/${session}`,
      payload,
    );
    return data;
  }

  async deleteSession(session: string) {
    const { data } = await this.client.delete(`/api/sessions/${session}`);
    return data;
  }

  async getSessionMe(session: string) {
    const { data } = await this.client.get(`/api/sessions/${session}/me`);
    return data;
  }

  async startSession(session: string) {
    const { data } = await this.client.post(`/api/sessions/${session}/start`);
    return data;
  }

  async stopSession(session: string) {
    const { data } = await this.client.post(`/api/sessions/${session}/stop`);
    return data;
  }

  async logoutSession(session: string) {
    const { data } = await this.client.post(
      `/api/sessions/${session}/logout`,
    );
    return data;
  }

  async restartSession(session: string) {
    const { data } = await this.client.post(
      `/api/sessions/${session}/restart`,
    );
    return data;
  }

  async getQrCode(session: string) {
    const response = await this.client.get<ArrayBuffer>(
      `/api/${session}/auth/qr`,
      {
        responseType: 'arraybuffer',
        validateStatus: () => true,
      },
    );
    return {
      data: response.data,
      status: response.status,
      headers: response.headers as Record<string, string>,
    };
  }

  async requestCode(session: string, payload: unknown) {
    const { data } = await this.client.post(
      `/api/${session}/auth/request-code`,
      payload,
    );
    return data;
  }

  async sendTextMessage(
    session: string,
    to: string,
    text: string,
    extra?: Record<string, unknown>,
  ) {
    const chatId = this.toChatId(to);
    const payload = {
      session,
      chatId,
      text,
      ...((extra ?? {}) as Record<string, unknown>),
    };
    const { data, status } = await this.client.post(
      '/api/sendText',
      payload,
    );
    return { data, status };
  }

  private toChatId(to: string): string {
    const digits = to.replace(/[^0-9]/g, '');
    if (!digits) {
      throw new BadRequestException('Invalid recipient number');
    }
    return `${digits}@c.us`;
  }
}
