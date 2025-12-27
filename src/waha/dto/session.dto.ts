import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  IsNotEmpty,
} from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  engine?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  restart?: boolean;
}

export class UpdateSessionDto {
  @IsOptional()
  @IsString()
  engine?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  restart?: boolean;
}
