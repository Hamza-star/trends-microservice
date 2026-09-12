import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  databaseName: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  nodeRedUrls?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}