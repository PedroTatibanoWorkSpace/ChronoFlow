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
  url?: string;

  @ValidateIf(isHttpTarget)
  @IsIn(ALLOWED_METHODS)
  method?: string;

  @ValidateIf(isHttpTarget)
  @IsObject()
  headers?: Record<string, string>;

  @ValidateIf(isHttpTarget)
  @IsObject()
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
}
