import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class AcknowledgeDto {
  @IsString()
  @IsNotEmpty()
  action: string;

  @IsMongoId()
  @IsNotEmpty()
  acknowledgedBy: string;
}
