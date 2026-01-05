import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  ValidateIf,
} from 'class-validator';

import {
  ALLOWED_METHODS,
  ALLOWED_TARGETS,
  isHttpTarget,
  isFunctionTarget,
  isMessageTarget,
} from '../../core/jobs/job-targets';

export class UpdateJobDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  cron?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @ValidateIf(isHttpTarget)
  @IsUrl()
  @IsOptional()
  url?: string;

  @ValidateIf(isHttpTarget)
  @IsIn(ALLOWED_METHODS)
  @IsOptional()
  method?: string;

  @ValidateIf(isHttpTarget)
  @IsObject()
  @IsOptional()
  headers?: Record<string, string>;

  @ValidateIf(isHttpTarget)
  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsIn(ALLOWED_TARGETS)
  targetType?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ValidateIf(isMessageTarget)
  @IsString()
  channelId?: string;

  @ValidateIf(isMessageTarget)
  @IsString()
  messageTemplate?: string;

  @ValidateIf(isMessageTarget)
  @IsString({ each: true })
  recipients?: string[];

  @ValidateIf(isFunctionTarget)
  @IsOptional()
  @IsString()
  functionId?: string;

  @ValidateIf(isFunctionTarget)
  @IsOptional()
  @IsString()
  functionCode?: string;

  @ValidateIf(isFunctionTarget)
  @IsOptional()
  @IsString()
  functionRuntime?: string;

  @ValidateIf(isFunctionTarget)
  @IsOptional()
  @IsObject()
  functionLimits?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  extras?: Record<string, unknown>;
}
