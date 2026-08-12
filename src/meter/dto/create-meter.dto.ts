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

  @ApiProperty({
    description: 'Unique key identifier for the meter',
    example: 'PG_PC_Z1_GW0_PLC1_EM01',
    uniqueItems: true
  })
  @IsString()
  @IsNotEmpty({ message: 'Unique key is required' })
  uniqueKey!: string;

  @ApiProperty({
    description: 'Area ID where meter belongs',
    example: '6a1d66106bccaa9d0cfad4f1',
    type: String
  })
  @IsMongoId({ message: 'Invalid area ID format' })
  @IsNotEmpty({ message: 'Area ID is required' })
  area!: string;

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
}