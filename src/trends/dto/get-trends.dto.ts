import { ArrayNotEmpty, IsArray, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class GetTrendsDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  start_date: string;

  @IsString()
  @IsNotEmpty()
  end_date: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}:\d{2}:\d{2}$/)
  start_time: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}:\d{2}:\d{2}$/)
  end_time: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  meterIds: string[];

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  suffixes: string[];

  @IsOptional()
  @IsString()
  userTimezone?: string;
}