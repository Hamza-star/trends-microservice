import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export { ApiResponse } from '../../common/dto/api-response.dto';


export class AreaResponse {
  @ApiProperty({ example: '6a1d66106bccaa9d0cfad4f1' })
  id!: string;

  @ApiProperty({ example: 'Energy Usage Report' })
  name!: string;

  @ApiProperty({ example: null, nullable: true })
  parentId!: string | null;

  @ApiProperty({ example: 0 })
  level!: number;

  @ApiProperty({ example: ['Energy Usage Report'] })
  path!: string[];

  // @ApiProperty({ example: '2026-06-01T11:00:37.477Z' })
  // createdAt!: Date;

  // @ApiProperty({ example: '2026-06-01T11:00:37.477Z' })
  // updatedAt!: Date;

  @ApiPropertyOptional({ type: [AreaResponse] })
  children?: AreaResponse[];
}