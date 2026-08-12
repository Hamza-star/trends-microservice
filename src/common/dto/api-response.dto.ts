import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiResponse<T = any> {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Operation completed successfully' })
  message!: string;

  @ApiPropertyOptional()
  data?: T;

  @ApiPropertyOptional()
  error?: string;

  @ApiPropertyOptional({ example: '2026-08-12T16:10:00.000Z' })
  timestamp?: string;
}
