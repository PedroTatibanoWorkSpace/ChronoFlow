import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
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
  qr(@Param('session') session: string) {
    return this.waha.getQrCode(session);
  }

  @Post(':session/auth/request-code')
  requestCode(
    @Param('session') session: string,
    @Body() payload: RequestCodeDto,
  ) {
    return this.waha.requestCode(session, payload);
  }
}
