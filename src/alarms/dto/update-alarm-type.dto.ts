import { IsMongoId, IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class UpdateAlarmTypeDto {
  @IsMongoId()
  @IsNotEmpty()
  typeId: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  acknowledgeType?: string;
}
