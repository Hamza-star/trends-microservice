import { Transform, Type } from "class-transformer";
import {
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Types } from "mongoose";
import { AlarmTriggerConfigDto } from "./alarmsTriggerConfig.dto";
import { LogicDto } from "./logic.dto";
import { LogicConfigurationDto } from "./logic-configuration.dto";

export class UpdateAlarmDto {
  @IsMongoId()
  @Transform(({ value }) => new Types.ObjectId(value))
  alarmConfigId: Types.ObjectId;

  @IsOptional()
  @IsMongoId()
  @Transform(({ value }) => value ? new Types.ObjectId(value) : undefined)
  alarmTypeId?: Types.ObjectId;

  @IsOptional()
  @IsString()
  alarmName?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => LogicDto)
  Logics?: LogicDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => LogicConfigurationDto)
  LogicConfiguration?: LogicConfigurationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AlarmTriggerConfigDto)
  alarmTriggerConfig?: AlarmTriggerConfigDto;

  @IsOptional()
  @IsString({ each: true })
  acknowledgementActions?: string[];
}