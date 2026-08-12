import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class ForgotPasswordBackupCodeDto {
  @ApiProperty({
    description: 'Email address of the user requesting password reset',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @ApiProperty({
    description: 'One of the 10 backup codes assigned to the user',
    example: '84920153',
  })
  @IsString()
  @IsNotEmpty({ message: 'Backup code is required' })
  backupCode!: string;

  @ApiProperty({
    description:
      'New password (must be at least 8 characters, containing 1 uppercase letter & 1 number)',
    example: 'NewPassword123!',
  })
  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one uppercase letter and one number',
  })
  newPassword!: string;
}
