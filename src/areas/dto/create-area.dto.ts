import { IsString, IsOptional, IsMongoId, IsArray, ArrayNotEmpty, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAreaDto {
  @ApiProperty({ 
    description: 'Area name',
    example: 'Energy Usage Report',
    minLength: 2
  })
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name!: string;

  @ApiPropertyOptional({ 
    description: 'Parent area ID (optional for root level)',
    example: '6a1d66106bccaa9d0cfad4f1',
    type: String
  })
  @IsOptional()
  @IsMongoId({ message: 'Invalid parent ID format' })
  parentId?: string;

  @ApiProperty({ 
    description: 'Full path array of area names',
    example: ['Energy Usage Report', 'Shift Wise'],
    type: [String]
  })
  @IsArray({ message: 'Path must be an array' })
  @ArrayNotEmpty({ message: 'Path cannot be empty' })
  @IsString({ each: true, message: 'Each path item must be a string' })
  path!: string[];
}