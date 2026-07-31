/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RefreshTokenService } from './refresh-token.service';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface RefreshTokenPayload {
  exp?: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly refreshTokenService: RefreshTokenService,
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

    const payload = {
      sub: userId,
      email: user.email,
      role: user.role,
      timezone: timezone,
    };

    const accessToken = this.jwtService.sign(
      payload as Record<string, unknown>,
      {
        expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') ?? '15m') as JwtSignOptions['expiresIn'],
      } as JwtSignOptions,
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId, type: 'refresh' } as Record<string, unknown>,
      {
        expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d') as JwtSignOptions['expiresIn'],
      } as JwtSignOptions,
    );

    await this.persistRefreshTokenSession(userId, refreshToken);

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    try {
      const payload = this.jwtService.verify(refreshToken);
      if (payload.type !== 'refresh') {
        throw new BadRequestException('Invalid refresh token');
      }

      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new BadRequestException('Invalid refresh token');
      }

      const userId = this.getUserId(user);

      const accessToken = this.jwtService.sign(
        {
          sub: userId,
          email: user.email,
          role: user.role,
          timezone: 'Asia/Karachi',
        } as Record<string, unknown>,
        {
          expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') ?? '15m') as JwtSignOptions['expiresIn'],
        } as JwtSignOptions,
      );

      const newRefreshToken = this.jwtService.sign(
        { sub: userId, type: 'refresh' } as Record<string, unknown>,
        {
          expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d') as JwtSignOptions['expiresIn'],
        } as JwtSignOptions,
      );

      await this.persistRefreshTokenSession(userId, newRefreshToken);

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new BadRequestException('Invalid or expired refresh token');
    }
  }

  private async persistRefreshTokenSession(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const payload = this.jwtService.decode(refreshToken) as RefreshTokenPayload | null;
    if (!payload?.exp) {
      throw new InternalServerErrorException('Refresh token expiry is missing');
    }

    await this.refreshTokenService.createSession(
      userId,
      refreshToken,
      new Date(payload.exp * 1000),
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
