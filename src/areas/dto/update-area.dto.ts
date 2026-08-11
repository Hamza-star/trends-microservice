import { PartialType } from '@nestjs/swagger';
import { CreateAreaDto } from './create-area.dto';
import { IsOptional, IsMongoId } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAreaDto extends PartialType(CreateAreaDto) {
  @ApiPropertyOptional({ 
    description: 'Parent area ID',
    example: '6a1d66106bccaa9d0cfad4f1'
  })
  @IsOptional()
  @IsMongoId({ message: 'Invalid parent ID format' })
  parentId?: string;
}