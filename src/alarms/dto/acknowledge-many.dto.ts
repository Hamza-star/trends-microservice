import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayNotEmpty, IsMongoId } from 'class-validator';

export class AcknowledgeManyDto {
  @ApiProperty({
    example: ['64a1f2c3e4b5a6d7e8f90123', '64a1f2c3e4b5a6d7e8f90124'],
    description: 'Array of occurrence ObjectIds to acknowledge',
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  ids: string[];

  @ApiProperty({ example: '64a1f2c3e4b5a6d7e8f90125', description: 'MongoDB ObjectId of the user performing the acknowledgement' })
  @IsMongoId()
  acknowledgedBy: string;
}
