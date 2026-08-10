import { IsArray, ArrayNotEmpty, IsMongoId } from 'class-validator';

export class AcknowledgeManyDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  ids: string[];

  @IsMongoId()
  acknowledgedBy: string;
}
