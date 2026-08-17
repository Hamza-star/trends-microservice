import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber } from 'class-validator';

export class AlarmsTypeDto {
  @ApiProperty({ example: 'Critical', description: 'Alarm type name' })
  @IsString()
  type: string;

  @ApiProperty({ example: 1, description: 'Priority level (lower = higher priority)' })
  @IsNumber()
  priority: number;

  @ApiProperty({ example: '#FF0000', description: 'Display color for this alarm type (hex code)' })
  @IsString()
  color: string;

  @ApiProperty({ example: 'CRIT_001', description: 'Unique code identifier for this alarm type' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'manual', description: 'Acknowledgement type (e.g. manual, auto)' })
  @IsString()
  acknowledgeType: string;
}
