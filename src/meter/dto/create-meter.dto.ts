// create-meter.dto.ts
import { IsString, IsOptional, IsBoolean, IsMongoId, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMeterDto {
  @ApiProperty({
    description: 'Meter name',
    example: 'OG6 T-53',
    minLength: 2
  })
  @IsString()
  @MinLength(2, { message: 'Meter name must be at least 2 characters long' })
  @IsNotEmpty({ message: 'Meter name is required' })
  meterName!: string;

  @ApiPropertyOptional({
    description: 'Unique key identifier for the meter',
    example: 'PG_PC_Z1_GW0_PLC1_EM01',
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
    example: 'T-53'
  })
  @IsOptional()
  @IsString()
  infoText?: string;

  @ApiPropertyOptional({
    description: 'Meter status',
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  status?: boolean;

  @ApiProperty({
    description: 'Key identifier for the meter',
    example: 'KEY-001-2026'
  })
  @IsString()
  @IsNotEmpty({ message: 'key is required' })
  key!: string;
}