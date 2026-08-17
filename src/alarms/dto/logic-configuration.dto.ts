import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class LogicConfigurationDto {
  @ApiProperty({ example: true, description: 'When true, ALL logic conditions must be met to trigger the alarm' })
  @IsBoolean()
  'All-True': boolean;

  @ApiProperty({ example: false, description: 'When true, ANY ONE logic condition being met will trigger the alarm' })
  @IsBoolean()
  AnyOneTrue: boolean;
}