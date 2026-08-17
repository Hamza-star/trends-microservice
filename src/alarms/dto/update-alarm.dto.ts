import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsMongoId, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Types } from 'mongoose';
import { AlarmTriggerConfigDto } from './alarmsTriggerConfig.dto';
import { LogicDto } from './logic.dto';
import { LogicConfigurationDto } from './logic-configuration.dto';

export class UpdateAlarmDto {
  @ApiProperty({ example: '64a1f2c3e4b5a6d7e8f90123', description: 'MongoDB ObjectId of the alarm config to update' })
  @IsMongoId()
  @Transform(({ value }) => new Types.ObjectId(value))
  alarmConfigId: Types.ObjectId;

  @ApiPropertyOptional({ example: '64a1f2c3e4b5a6d7e8f90124', description: 'MongoDB ObjectId of the new alarm type to assign' })
  @IsOptional()
  @IsMongoId()
  @Transform(({ value }) => value ? new Types.ObjectId(value) : undefined)
  alarmTypeId?: Types.ObjectId;

  @ApiPropertyOptional({ example: 'Updated Voltage Alarm', description: 'Updated human-readable alarm name' })
  @IsOptional()
  @IsString()
  alarmName?: string;

  @ApiPropertyOptional({ type: () => [LogicDto], description: 'Replacement list of logic conditions' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => LogicDto)
  Logics?: LogicDto[];

  @ApiPropertyOptional({ type: () => LogicConfigurationDto, description: 'Updated logic evaluation mode (All-True / AnyOneTrue)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => LogicConfigurationDto)
  LogicConfiguration?: LogicConfigurationDto;

  @ApiPropertyOptional({ type: () => AlarmTriggerConfigDto, description: 'Updated trigger configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => AlarmTriggerConfigDto)
  alarmTriggerConfig?: AlarmTriggerConfigDto;

  @ApiPropertyOptional({ example: ['Resolved', 'Escalated'], type: [String], description: 'Updated list of allowed acknowledgement action labels' })
  @IsOptional()
  @IsString({ each: true })
  acknowledgementActions?: string[];
}