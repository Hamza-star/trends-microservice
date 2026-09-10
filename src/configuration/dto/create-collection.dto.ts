import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCollectionDto {
  @IsString()
  @IsNotEmpty()
  collectionName: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}