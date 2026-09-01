// update-meter.dto.ts
import { IsString, IsOptional, IsBoolean, IsMongoId, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMeterDto {
  @ApiPropertyOptional({
    description: 'Meter name',
    example: 'OG6 T-53 Updated',
    minLength: 2
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Meter name must be at least 2 characters long' })
  meterName?: string;

  @ApiPropertyOptional({
    description: 'Unique key identifier for the meter',
    example: 'PG_PC_Z1_GW0_PLC1_EM01_UPDATED',
    uniqueItems: true
  })
  @IsOptional()
  @IsString()
  uniqueKey?: string;

  @ApiPropertyOptional({
    description: 'Area ID where meter belongs',
    example: '6a1d66106bccaa9d0cfad4f1',
    type: String
  })
  @IsOptional()
  @IsMongoId({ message: 'Invalid area ID format' })
  area?: string;

  @ApiPropertyOptional({
    description: 'Additional information about the meter',
    example: 'T-53 Updated'
  })
  @IsOptional()
  @IsString()
  infoText?: string;

  @ApiPropertyOptional({
    description: 'Meter status',
    example: false,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  status?: boolean;

  @ApiPropertyOptional({
    description: 'Key identifier for the meter',
    example: 'KEY-001-2026-UPDATED'
  })
  @IsOptional()
  @IsString()
  key?: string;
}