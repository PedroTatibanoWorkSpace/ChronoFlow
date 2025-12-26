import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  healthCheck(): { status: 'ok'; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
