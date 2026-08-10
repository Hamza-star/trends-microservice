import { IsIn, IsNumber, IsString } from "class-validator";

export class ThresholdDto {
  @IsNumber()
  value: number;

  @IsString()
  @IsIn(['>', '<', '>=', '<=', '==', '!='])
  operator: string;
}