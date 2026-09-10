import { IsString, IsOptional, IsMongoId, IsArray, ArrayNotEmpty, IsNotEmpty, MinLength } from 'class-validator';

export class CreateAreaDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name!: string;

  @IsOptional()
  @IsMongoId({ message: 'Invalid parent ID format' })
  parentId?: string;
 
}