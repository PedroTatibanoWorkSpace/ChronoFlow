import { Chrono } from '../entities/job.entity';

export type ExecutionStatus = 'SUCCESS' | 'FAILED';

export interface ExecutionResult {
  status: ExecutionStatus;
  httpStatus?: number | null;
  responseSnippet?: string | null;
  errorMessage?: string | null;
  result?: unknown | null;
  durationMs: number;
}

export interface TargetExecutor {
  supports(targetType: Chrono['targetType']): boolean;
  execute(chrono: Chrono): Promise<ExecutionResult>;
}
