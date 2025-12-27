import { IsObject, IsOptional, IsString } from 'class-validator';

export class RequestCodeDto {
  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}
