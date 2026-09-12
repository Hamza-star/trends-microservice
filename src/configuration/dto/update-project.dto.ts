import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  databaseName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  nodeRedUrls?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}