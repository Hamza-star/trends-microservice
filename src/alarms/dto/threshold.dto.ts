import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsString } from 'class-validator';

export class ThresholdDto {
  @ApiProperty({ example: 230, description: 'Threshold numeric value to compare against' })
  @IsNumber()
  value: number;

  @ApiProperty({ example: '>', enum: ['>', '<', '>=', '<=', '==', '!='], description: 'Comparison operator' })
  @IsString()
  @IsIn(['>', '<', '>=', '<=', '==', '!='])
  operator: string;
}