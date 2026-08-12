import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'Updated full name of the user',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated email address of the user',
    example: 'john.doe@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Current password (required if updating password or sensitive info)',
    example: 'CurrentPassword123!',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  currentPassword?: string;

  @ApiPropertyOptional({
    description:
      'New password (must be at least 8 characters, with 1 uppercase letter & 1 number)',
    example: 'NewPassword123!',
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @Matches(/^(?=.*[A-Z])(?=.*\d)/, {
    message:
      'New password must contain at least one uppercase letter and one number',
  })
  newPassword?: string;
}
