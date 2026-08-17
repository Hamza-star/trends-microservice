import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsOptional, ValidateNested } from 'class-validator';
import { ThresholdDto } from './threshold.dto';

export class LogicDto {
  @ApiProperty({ example: 'Z1_GW0_EM01', description: 'Location token(s) used to match the payload key' })
  @IsString()
  alarmLocation: string;

  @ApiPropertyOptional({ example: 'SubZone_A', description: 'Optional sub-location segment for finer matching' })
  @IsString()
  @IsOptional()
  alarmSubLocation?: string;

  @ApiPropertyOptional({ example: 'EM01', description: 'Optional device segment for finer matching' })
  @IsString()
  @IsOptional()
  alarmDevice?: string;

  @ApiProperty({ example: 'V_L1_N', description: 'Parameter suffix used to match the payload key ending' })
  @IsString()
  alarmParameter: string;

  @ApiPropertyOptional({
    type: () => [ThresholdDto],
    description: 'Optional list of threshold conditions that must be met to trigger the alarm',
  })
  @ValidateNested({ each: true })
  @Type(() => ThresholdDto)
  @IsOptional()
  thresholds?: ThresholdDto[];
}