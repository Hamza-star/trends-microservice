import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class AcknowledgeDto {
  @ApiProperty({ example: 'Resolved', description: 'Acknowledgement action label' })
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiProperty({ example: '64a1f2c3e4b5a6d7e8f90123', description: 'MongoDB ObjectId of the user acknowledging the alarm' })
  @IsMongoId()
  @IsNotEmpty()
  acknowledgedBy: string;
}
