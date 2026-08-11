import { IsString, IsOptional, IsMongoId, IsArray, ArrayNotEmpty, MinLength } from 'class-validator';

export class CreateAreaDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name!: string;

  @IsOptional()
  @IsMongoId({ message: 'Invalid parent ID format' })
  parentId?: string;

  @IsArray({ message: 'Path must be an array' })
  @ArrayNotEmpty({ message: 'Path cannot be empty' })
  @IsString({ each: true, message: 'Each path item must be a string' })
  path!: string[];
}