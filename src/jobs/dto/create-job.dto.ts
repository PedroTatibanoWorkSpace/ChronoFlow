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
const isHttpTarget = (o: CreateJobDto): boolean =>
  (o.targetType ?? 'HTTP') === 'HTTP';

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  cron: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsOptional()
  @IsIn(ALLOWED_TARGETS)
  targetType?: string = 'HTTP';

  @ValidateIf(isHttpTarget)
  @IsUrl()
  url: string;

  @ValidateIf(isHttpTarget)
  @IsIn(ALLOWED_METHODS)
  method?: string = 'POST';

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
  @IsObject()
  config?: Record<string, unknown>;
}
