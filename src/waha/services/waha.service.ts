import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface WahaSession {
  name: string;
  status: string;
  [key: string]: unknown;
}

export interface WahaMessageResponse {
  id: string;
  [key: string]: unknown;
}

@Injectable()
export class WahaService {
  private readonly _client: AxiosInstance | null;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.enabled = this.config.get<boolean>('wahaEnabled') ?? true;

    if (!this.enabled) {
      this._client = null;
      return;
    }

    const baseURL = this.config.get<string>('wahaBaseUrl');
    const apiKey = this.config.get<string>('wahaApiKey');

    if (!baseURL) {
      throw new BadRequestException('WAHA_BASE_URL is not configured');
    }
    if (!apiKey) {
      throw new BadRequestException('WAHA_API_KEY is not configured');
    }

    this._client = axios.create({
      baseURL,
      headers: {
        'X-API-KEY': apiKey,
      },
      timeout: 15000,
    });
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  private get client(): AxiosInstance {
    if (!this._client) {
      throw new BadRequestException('WAHA integration is disabled');
    }
    return this._client;
  }

  async listSessions(): Promise<WahaSession[]> {
    const { data } = await this.client.get<WahaSession[]>('/api/sessions');
    return data;
  }

  async createSession(payload: unknown): Promise<WahaSession> {
    const { data } = await this.client.post<WahaSession>(
      '/api/sessions',
      payload,
    );
    return data;
  }

  async getSession(session: string): Promise<WahaSession> {
    const { data } = await this.client.get<WahaSession>(
      `/api/sessions/${session}`,
    );
    return data;
  }

  async updateSession(session: string, payload: unknown): Promise<WahaSession> {
    const { data } = await this.client.put<WahaSession>(
      `/api/sessions/${session}`,
      payload,
    );
    return data;
  }

  async deleteSession(session: string): Promise<WahaSession> {
    const { data } = await this.client.delete<WahaSession>(
      `/api/sessions/${session}`,
    );
    return data;
  }

  async getSessionMe(session: string): Promise<WahaSession> {
    const { data } = await this.client.get<WahaSession>(
      `/api/sessions/${session}/me`,
    );
    return data;
  }

  async startSession(session: string): Promise<WahaSession> {
    const { data } = await this.client.post<WahaSession>(
      `/api/sessions/${session}/start`,
    );
    return data;
  }

  async stopSession(session: string): Promise<WahaSession> {
    const { data } = await this.client.post<WahaSession>(
      `/api/sessions/${session}/stop`,
    );
    return data;
  }

  async logoutSession(session: string): Promise<WahaSession> {
    const { data } = await this.client.post<WahaSession>(
      `/api/sessions/${session}/logout`,
    );
    return data;
  }

  async restartSession(session: string): Promise<WahaSession> {
    const { data } = await this.client.post<WahaSession>(
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

  async requestCode(
    session: string,
    payload: unknown,
  ): Promise<{ status: string }> {
    const { data } = await this.client.post<{ status: string }>(
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
  ): Promise<{ data: WahaMessageResponse; status: number }> {
    const chatId = this.toChatId(to);
    const payload = {
      session,
      chatId,
      text,
      ...(extra ?? {}),
    };
    const { data, status } = await this.client.post<WahaMessageResponse>(
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
