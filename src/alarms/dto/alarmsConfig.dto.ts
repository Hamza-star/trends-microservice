import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsMongoId, IsString, ValidateNested } from 'class-validator';
import { AlarmTriggerConfigDto } from './alarmsTriggerConfig.dto';
import { LogicDto } from './logic.dto';
import { LogicConfigurationDto } from './logic-configuration.dto';

export class ConfigAlarmDto {
  @ApiProperty({ example: '64a1f2c3e4b5a6d7e8f90123', description: 'MongoDB ObjectId of the alarm type this config belongs to' })
  @IsMongoId()
  alarmTypeId!: string;

  @ApiProperty({ example: 'High Voltage L1', description: 'Human-readable name for this alarm configuration' })
  @IsString()
  alarmName!: string;

  // When creating alarms, matching is done by alarmLocation and alarmParameter
  // against underscore-delimited payload keys. These values should be provided
  // as the logical location and parameter segments.

  @ApiProperty({
    type: () => [LogicDto],
    description: 'List of logic conditions used to evaluate whether the alarm should trigger',
  })
  @ValidateNested({ each: true })
  @Type(() => LogicDto)
  Logics!: LogicDto[];

  @ApiProperty({ type: () => LogicConfigurationDto, description: 'Defines whether ALL or ANY ONE logic condition must be met' })
  @ValidateNested()
  @Type(() => LogicConfigurationDto)
  LogicConfiguration!: LogicConfigurationDto;

  @ApiProperty({ type: () => AlarmTriggerConfigDto, description: 'Trigger configuration (persistence time, occurrence count/window)' })
  @ValidateNested()
  @Type(() => AlarmTriggerConfigDto)
  alarmTriggerConfig!: AlarmTriggerConfigDto;

  @ApiProperty({ example: ['Resolved', 'Acknowledged'], type: [String], description: 'List of allowed acknowledgement action labels' })
  @IsString({ each: true })
  acknowledgementActions!: string[];
}