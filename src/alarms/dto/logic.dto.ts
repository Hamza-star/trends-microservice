import { Type } from "class-transformer";
import { IsString,IsOptional, ValidateNested } from "class-validator";
import { ThresholdDto } from "./threshold.dto";

export class LogicDto {
  @IsString()
  // The location token(s) used for matching the payload key.
  // Example: "Z1_GW0_EM01" or "U1_GW01".
  alarmLocation: string;

  @IsString()
  @IsOptional()
  alarmSubLocation?: string;

  @IsString()
  @IsOptional()
  alarmDevice?: string;

  @IsString()
  // The parameter suffix used for matching the payload key ending.
  // Example: "V_L1_N" or "Voltage_AB".
  alarmParameter: string;

  @ValidateNested({ each: true })
  @Type(() => ThresholdDto)
  @IsOptional()
  thresholds?: ThresholdDto[];
}