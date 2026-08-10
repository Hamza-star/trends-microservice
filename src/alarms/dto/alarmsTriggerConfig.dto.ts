import { Type } from "class-transformer";
import { IsNumber, IsOptional, ValidateNested } from "class-validator";
import { ThresholdDto } from "./threshold.dto";

export class AlarmTriggerConfigDto {
  @IsOptional()
  @IsNumber()
  persistenceTime?: number;

  @IsOptional()
  @IsNumber()
  occursCount?: number;

  @IsOptional()
  @IsNumber()
  occursWithin?: number;

  // thresholds field is removed from here since it's now in LogicDto
}