import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

export class AlarmTriggerConfigDto {
  @ApiPropertyOptional({ example: 5000, description: 'Time in milliseconds the condition must persist before the alarm triggers' })
  @IsOptional()
  @IsNumber()
  persistenceTime?: number;

  @ApiPropertyOptional({ example: 3, description: 'Number of occurrences required before the alarm triggers' })
  @IsOptional()
  @IsNumber()
  occursCount?: number;

  @ApiPropertyOptional({ example: 60000, description: 'Time window in milliseconds within which the occurrences must happen' })
  @IsOptional()
  @IsNumber()
  occursWithin?: number;

  // thresholds field is removed from here since it's now in LogicDto
}