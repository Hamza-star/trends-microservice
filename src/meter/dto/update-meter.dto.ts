import { PartialType } from '@nestjs/swagger';
import { CreateMeterDto } from './create-meter.dto';
import { IsOptional, IsMongoId, IsBoolean, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMeterDto extends PartialType(CreateMeterDto) {
  @ApiPropertyOptional({
    description: 'Meter name',
    example: 'OG6 T-53 Updated'
  })
  @IsOptional()
  @IsString()
  meterName?: string;

  @ApiPropertyOptional({
    description: 'Unique key identifier',
    example: 'PG_PC_Z1_GW0_PLC1_EM01_UPDATED'
  })
  @IsOptional()
  @IsString()
  uniqueKey?: string;

  @ApiPropertyOptional({
    description: 'Area ID',
    example: '6a1d66106bccaa9d0cfad4f1'
  })
  @IsOptional()
  @IsMongoId({ message: 'Invalid area ID format' })
  area?: string;

  @ApiPropertyOptional({
    description: 'Additional information',
    example: 'T-53 Updated'
  })
  @IsOptional()
  @IsString()
  infoText?: string;

  @ApiPropertyOptional({
    description: 'Meter status',
    example: false
  })
  @IsOptional()
  @IsBoolean()
  status?: boolean;
}