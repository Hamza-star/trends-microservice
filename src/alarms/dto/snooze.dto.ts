// snooze.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayNotEmpty,
  IsMongoId,
  IsBoolean,
  IsNumber,
  Min,
  IsDateString,
} from 'class-validator';

export class SnoozeDto {
  @ApiProperty({
    example: ['64a1f2c3e4b5a6d7e8f90123', '64a1f2c3e4b5a6d7e8f90124'],
    description: 'Array of occurrence ObjectIds to snooze',
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  ids: string[];

  @ApiProperty({ example: true, description: 'Whether to enable snooze on the alarm' })
  @IsBoolean()
  @Type(() => Boolean)
  alarmSnooze: boolean;

  @ApiProperty({ example: 30, description: 'Duration in minutes to snooze the alarm (minimum 1)' })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  snoozeDuration: number;

  @ApiProperty({ example: '2025-08-17T10:00:00.000Z', description: 'ISO 8601 datetime when the snooze starts' })
  @IsDateString()
  snoozeAt: string;
}
