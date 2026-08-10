// snooze.dto.ts
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
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  ids: string[];

  @IsBoolean()
  @Type(() => Boolean)
  alarmSnooze: boolean;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  snoozeDuration: number;

  @IsDateString()
  snoozeAt: string;
}
