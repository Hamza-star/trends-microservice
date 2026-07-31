/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RefreshTokenService } from './refresh-token.service';
import { AuthTokenService } from './auth-token.service';

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
    await this.usersService.registerUser(email, hashedPassword);

    return { message: 'Signup Successfull' };
  }

  async login(email: string, password: string, timezone: string = 'Asia/Karachi') {
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
      tokens.refreshTokenExpiresAt,
    );

    return {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refreshTokens(refreshToken: string): Promise<{
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

    await this.refreshTokenService.validateSession(
      payload.sub,
      payload.jti,
      refreshToken,
    );

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

    await this.persistRefreshTokenSession(
      userId,
      tokens.refreshToken,
      tokens.refreshTokenId,
      tokens.refreshTokenExpiresAt,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  private async persistRefreshTokenSession(
    userId: string,
    refreshToken: string,
    jti: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.refreshTokenService.createSession(
      userId,
      refreshToken,
      jti,
      expiresAt,
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
