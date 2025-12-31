import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { WahaService } from '../services/waha.service';
import { CreateSessionDto, UpdateSessionDto } from '../dto/session.dto';
import { RequestCodeDto } from '../dto/auth.dto';

@Controller('waha/sessions')
export class WahaSessionsController {
  constructor(private readonly waha: WahaService) {}

  @Get()
  list() {
    return this.waha.listSessions();
  }

  @Post()
  create(@Body() payload: CreateSessionDto) {
    return this.waha.createSession(payload);
  }

  @Get(':session')
  get(@Param('session') session: string) {
    return this.waha.getSession(session);
  }

  @Put(':session')
  update(
    @Param('session') session: string,
    @Body() payload: UpdateSessionDto,
  ) {
    return this.waha.updateSession(session, payload);
  }

  @Delete(':session')
  remove(@Param('session') session: string) {
    return this.waha.deleteSession(session);
  }

  @Get(':session/me')
  me(@Param('session') session: string) {
    return this.waha.getSessionMe(session);
  }

  @Post(':session/start')
  start(@Param('session') session: string) {
    return this.waha.startSession(session);
  }

  @Post(':session/stop')
  stop(@Param('session') session: string) {
    return this.waha.stopSession(session);
  }

  @Post(':session/logout')
  logout(@Param('session') session: string) {
    return this.waha.logoutSession(session);
  }

  @Post(':session/restart')
  restart(@Param('session') session: string) {
    return this.waha.restartSession(session);
  }

  @Get(':session/auth/qr')
  async qr(@Param('session') session: string, @Res() res: Response) {
    const qr = await this.waha.getQrCode(session);
    const contentType =
      (qr.headers['content-type'] as string | undefined) ?? 'image/png';
    const raw = Buffer.isBuffer(qr.data)
      ? qr.data
      : Buffer.from(qr.data as ArrayBuffer);

    if (contentType.includes('image')) {
      res.setHeader('Content-Type', contentType);
      return res.send(raw);
    }

    const text = raw.toString('utf8');
    const match = text.match(
      new RegExp('data:image\\\\/png;base64,([A-Za-z0-9+/=]+)'),
    );
    if (match && match[1]) {
      const png = Buffer.from(match[1], 'base64');
      res.setHeader('Content-Type', 'image/png');
      return res.send(png);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(text);
  }

  @Post(':session/auth/request-code')
  requestCode(
    @Param('session') session: string,
    @Body() payload: RequestCodeDto,
  ) {
    return this.waha.requestCode(session, payload);
  }
}
