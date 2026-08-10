import { Type } from "class-transformer";
import { IsString,IsOptional, ValidateNested } from "class-validator";
import { ThresholdDto } from "./threshold.dto";

export class LogicDto {
  @IsString()
  alarmLocation: string;

  @IsString()
  @IsOptional()
  alarmSubLocation?: string;

  @IsString()
  @IsOptional()
  alarmDevice?: string;

  @IsString()
  alarmParameter: string;

  @ValidateNested({ each: true })
  @Type(() => ThresholdDto)
  @IsOptional()
  thresholds?: ThresholdDto[];
}