/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import {
  RefreshTokenService,
  RefreshTokenSessionMetadata,
} from './refresh-token.service';
import { AuthTokenService } from './auth-token.service';
import { ForgotPasswordBackupCodeDto } from './dtos/forgot-password-backup-code.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async signup(email: string, password: string) {
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      throw new BadRequestException(
        'Password must be at least 8 characters and include one uppercase letter and one number',
      );
    }

    const saltRounds = Number(this.configService.get('BCRYPT_SALT_ROUNDS') ?? 10);
    const hashedPassword: string = await bcrypt.hash(password, saltRounds);
    if (!hashedPassword) {
      throw new BadRequestException('Error hashing password');
    }
    const roleId = await this.usersService.resolveDefaultRoleId();
    const newUser = await this.usersService.registerUser(email, hashedPassword, roleId);

    const backupCodes = this.generateBackupCodes();
    const userId = this.getUserId(newUser);
    await this.usersService.saveBackupCodes(userId, backupCodes);

    return {
      message: 'Signup Successfull',
      backupCodes,
    };
  }

  async login(
    email: string,
    password: string,
    timezone: string = 'Asia/Karachi',
    metadata: RefreshTokenSessionMetadata = {},
  ) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid credentials');
    }

    const userId = this.getUserId(user);

    const tokens = this.authTokenService.issueTokenPair({
      userId,
      email: user.email,
      role: user.role,
      timezone,
    });

    await this.persistRefreshTokenSession(
      userId,
      tokens.refreshToken,
      tokens.refreshTokenId,
      tokens.refreshTokenId,
      tokens.refreshTokenExpiresAt,
      metadata,
    );

    return {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refreshTokens(
    refreshToken: string,
    metadata: RefreshTokenSessionMetadata = {},
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    let payload: ReturnType<AuthTokenService['verifyRefreshToken']>;
    try {
      payload = this.authTokenService.verifyRefreshToken(refreshToken);
      if (payload.type !== 'refresh' || !payload.jti) {
        throw new UnauthorizedException('Invalid refresh token');
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findAuthUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (user.userStatus !== 'active') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const userId = this.getUserId(user);

    const tokens = this.authTokenService.issueTokenPair({
      userId,
      email: user.email,
      role: user.role,
      timezone: 'Asia/Karachi',
    });

    await this.refreshTokenService.rotateSession(
      payload.sub,
      payload.jti,
      refreshToken,
      {
        refreshToken: tokens.refreshToken,
        jti: tokens.refreshTokenId,
        expiresAt: tokens.refreshTokenExpiresAt,
        metadata,
      },
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    let payload: ReturnType<AuthTokenService['verifyRefreshToken']>;
    try {
      payload = this.authTokenService.verifyRefreshToken(refreshToken);
    } catch {
      return;
    }

    if (payload.type !== 'refresh' || !payload.jti) {
      return;
    }

    await this.refreshTokenService.revokeCurrentSession(
      payload.sub,
      payload.jti,
      refreshToken,
    );
  }

  async logoutAllDevices(userId: string): Promise<number> {
    return this.refreshTokenService.revokeAllUserSessions(userId);
  }

  async forgotPasswordWithBackupCode(
    dto: ForgotPasswordBackupCodeDto,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new BadRequestException('Invalid email or backup code');
    }

    const backupCodes = (user.backupCodes ?? []) as Array<{
      code: string;
      used: boolean;
      usedAt?: Date | null;
    }>;

    const targetCodeIndex = backupCodes.findIndex(
      (bc) => bc.code === dto.backupCode && !bc.used,
    );

    if (targetCodeIndex === -1) {
      throw new BadRequestException('Invalid or already used backup code');
    }

    const saltRounds = Number(this.configService.get('BCRYPT_SALT_ROUNDS') ?? 10);
    const hashedPassword = await bcrypt.hash(dto.newPassword, saltRounds);

    backupCodes[targetCodeIndex].used = true;
    backupCodes[targetCodeIndex].usedAt = new Date();

    user.password = hashedPassword;
    user.backupCodes = backupCodes;

    await (user as any).save();

    const userId = this.getUserId(user);
    await this.refreshTokenService.revokeAllUserSessions(userId);

    return { message: 'Password reset successfully' };
  }

  private generateBackupCodes(count = 10, length = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      let code = '';
      for (let j = 0; j < length; j++) {
        code += crypto.randomInt(0, 10).toString();
      }
      codes.push(code);
    }
    return codes;
  }

  private async persistRefreshTokenSession(
    userId: string,
    refreshToken: string,
    jti: string,
    familyId: string,
    expiresAt: Date,
    metadata: RefreshTokenSessionMetadata,
  ): Promise<void> {
    await this.refreshTokenService.createSession(
      userId,
      refreshToken,
      jti,
      familyId,
      expiresAt,
      metadata,
    );
  }

  private getUserId(user: { id?: unknown; _id?: unknown }): string {
    const userId = user.id ?? user._id;
    if (!userId) {
      throw new InternalServerErrorException('User identifier is missing');
    }

    return String(userId);
  }
}

