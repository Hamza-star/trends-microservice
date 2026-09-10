import { PartialType } from '@nestjs/mapped-types';
import { CreateAreaDto } from './create-area.dto';
import { IsNotEmpty, IsOptional, IsMongoId, IsString } from 'class-validator';

export class UpdateAreaDto extends PartialType(CreateAreaDto) {
  @IsOptional()
  @IsMongoId({ message: 'Invalid parent ID format' })
  parentId?: string;
}