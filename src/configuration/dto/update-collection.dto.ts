import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateCollectionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  collectionName?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}