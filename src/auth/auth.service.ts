/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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

    const payload = {
      sub: user.id,
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
      { sub: user.id, type: 'refresh' } as Record<string, unknown>,
      {
        expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d') as JwtSignOptions['expiresIn'],
      } as JwtSignOptions,
    );

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

      const accessToken = this.jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
          timezone: 'Asia/Karachi',
        } as Record<string, unknown>,
        {
          expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') ?? '15m') as JwtSignOptions['expiresIn'],
        } as JwtSignOptions,
      );

      const newRefreshToken = this.jwtService.sign(
        { sub: user.id, type: 'refresh' } as Record<string, unknown>,
        {
          expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d') as JwtSignOptions['expiresIn'],
        } as JwtSignOptions,
      );

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch {
      throw new BadRequestException('Invalid or expired refresh token');
    }
  }
}
