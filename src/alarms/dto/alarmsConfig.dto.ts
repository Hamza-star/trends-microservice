import { Transform, Type } from "class-transformer";
import {
  IsMongoId,
  IsString,
  ValidateNested,
} from "class-validator";
import { Types } from "mongoose";
import { AlarmTriggerConfigDto } from "./alarmsTriggerConfig.dto";
import { LogicDto } from "./logic.dto";
import { LogicConfigurationDto } from "./logic-configuration.dto";

export class ConfigAlarmDto {
  @IsMongoId()
  @Transform(({ value }) => new Types.ObjectId(value))
  alarmTypeId: Types.ObjectId;

  @IsString()
  alarmName: string;

  @ValidateNested({ each: true })
  @Type(() => LogicDto)
  Logics: LogicDto[];

  @ValidateNested()
  @Type(() => LogicConfigurationDto)
  LogicConfiguration: LogicConfigurationDto;

  @ValidateNested()
  @Type(() => AlarmTriggerConfigDto)
  alarmTriggerConfig: AlarmTriggerConfigDto;

  @IsString({ each: true })
  acknowledgementActions: string[];
}