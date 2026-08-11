import { Type } from "class-transformer";
import {
  IsMongoId,
  IsString,
  ValidateNested,
} from "class-validator";
import { AlarmTriggerConfigDto } from "./alarmsTriggerConfig.dto";
import { LogicDto } from "./logic.dto";
import { LogicConfigurationDto } from "./logic-configuration.dto";

export class ConfigAlarmDto {
  @IsMongoId()
  alarmTypeId: string;  // Keep as string

  @IsString()
  alarmName: string;

  // When creating alarms, matching is done by alarmLocation and alarmParameter
  // against underscore-delimited payload keys. These values should be provided
  // as the logical location and parameter segments.

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