import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export { ApiResponse } from '../../common/dto/api-response.dto';


export class MeterResponse {
  @ApiProperty({ example: '6948dcb7cdb8889985c31a19' })
  id!: string;

  @ApiProperty({ example: 'OG6 T-53' })
  meterName!: string;

  @ApiProperty({ example: 'PG_PC_Z1_GW0_PLC1_EM01' })
  uniqueKey!: string;

  @ApiProperty({ 
    example: '6a1d66106bccaa9d0cfad4f1',
    description: 'Area ID'
  })
  area!: string;

  @ApiPropertyOptional({ example: 'T-53' })
  infoText?: string;

  @ApiProperty({ example: true })
  status!: boolean;

  @ApiProperty({ example: '2025-12-22T05:52:55.853Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-04-28T11:23:23.226Z' })
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'Area details if populated' })
  areaDetails?: any;
}