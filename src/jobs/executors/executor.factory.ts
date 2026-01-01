import { Injectable, NotFoundException } from '@nestjs/common';
import { Chrono } from '../entities/job.entity';
import { HttpExecutor } from './http.executor';
import { TargetExecutor } from './target-executor';
import { MessageExecutor } from './message.executor';
import { FunctionExecutor } from './function.executor';

@Injectable()
export class ExecutorFactory {
  private readonly executors: TargetExecutor[];

  constructor(
    httpExecutor: HttpExecutor,
    messageExecutor: MessageExecutor,
    functionExecutor: FunctionExecutor,
  ) {
    this.executors = [httpExecutor, messageExecutor, functionExecutor];
  }

  get(targetType: Chrono['targetType']): TargetExecutor {
    const executor = this.executors.find((e) => e.supports(targetType));
    if (!executor) {
      throw new NotFoundException(
        `No executor found for target type ${targetType}`,
      );
    }
    return executor;
  }
}
