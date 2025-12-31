import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import type { Response } from 'express';
import { SCHEDULE_EXAMPLES } from '../../jobs/utils/schedule.util';

@Catch()
export class AllExceptionsFilter
  extends BaseExceptionFilter
  implements ExceptionFilter
{
  constructor(httpAdapterHost: HttpAdapterHost) {
    super(httpAdapterHost.httpAdapter);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const base = {
      statusCode: status,
      timestamp: new Date().toISOString(),
    };

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'object') {
        const body = res as Record<string, unknown>;
        const message = body.message;
        const needsExamples =
          typeof message === 'string' &&
          message.toLowerCase().includes('cron') &&
          !body.examples;
        const withExamples = needsExamples
          ? { ...body, examples: SCHEDULE_EXAMPLES }
          : body;
        response.status(status).json({ ...base, ...withExamples });
        return;
      }
      const message = res ?? exception.message;
      const maybeCronExamples =
        typeof message === 'string' && message.toLowerCase().includes('cron')
          ? { examples: SCHEDULE_EXAMPLES }
          : {};
      response.status(status).json({
        ...base,
        message,
        ...maybeCronExamples,
      });
      return;
    }

    response.status(status).json({
      ...base,
      message: 'Internal server error',
    });
  }
}
