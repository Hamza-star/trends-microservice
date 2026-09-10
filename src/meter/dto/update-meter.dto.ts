// update-meter.dto.ts
import { IsString, IsOptional, IsBoolean, IsMongoId, IsNotEmpty, MinLength } from 'class-validator';

export class UpdateMeterDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Meter name must be at least 2 characters long' })
  meterName?: string;

  @IsOptional()
  @IsString()
  uniqueKey?: string;

  @IsOptional()
  @IsMongoId({ message: 'Invalid area ID format' })
  area?: string;

  @IsOptional()
  @IsString()
  infoText?: string;

  @IsOptional()
  @IsBoolean()
  status?: boolean;

  @IsOptional()
  @IsString()
  key?: string;
}