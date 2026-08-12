/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsEmail, IsString, MinLength, MaxLength, IsOptional, Matches, IsNotEmpty } from 'class-validator';

export class SignupDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(100, { message: 'Email must not exceed 100 characters' })
  email!: string;

  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(32, { message: 'Password must not exceed 32 characters' })
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
  @Matches(/[@$!%*?&]/, { message: 'Password must contain at least one special character (@$!%*?&)' })
  password!: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  password!: string;

  @IsOptional()
  @IsString({ message: 'Timezone must be a string' })
  timezone?: string;

  @IsOptional()
  @IsString({ message: 'Device name must be a string' })
  @MaxLength(100, { message: 'Device name must not exceed 100 characters' })
  deviceName?: string;
}

export * from './forgot-password-backup-code.dto';

