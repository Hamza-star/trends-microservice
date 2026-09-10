// create-meter.dto.ts
import { IsString, IsOptional, IsBoolean, IsMongoId, MinLength, IsNotEmpty } from 'class-validator';

export class CreateMeterDto {
  @IsString()
  @MinLength(2, { message: 'Meter name must be at least 2 characters long' })
  @IsNotEmpty({ message: 'Meter name is required' })
  meterName!: string;

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

  @IsString()
  @IsNotEmpty({ message: 'key is required' })
  key!: string;
}