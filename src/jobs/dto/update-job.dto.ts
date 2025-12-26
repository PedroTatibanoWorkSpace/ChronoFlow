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

const ALLOWED_METHODS = ['POST', 'GET', 'PUT', 'PATCH', 'DELETE'];
const ALLOWED_TARGETS = ['HTTP'];
const isHttpTarget = (o: UpdateJobDto): boolean =>
  (o.targetType ?? 'HTTP') === 'HTTP';

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
}
