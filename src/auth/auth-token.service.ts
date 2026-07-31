import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { randomUUID } from 'crypto';

export interface TokenUser {
  userId: string;
  email: string;
  role: unknown;
  timezone: string;
}

export interface IssuedTokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenId: string;
  refreshTokenExpiresAt: Date;
}

interface DecodedRefreshToken {
  exp?: number;
}

interface VerifiedRefreshToken {
  sub: string;
  type: string;
  jti?: string;
}

@Injectable()
export class AuthTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  issueTokenPair(user: TokenUser): IssuedTokenPair {
    const accessToken = this.jwtService.sign(
      {
        sub: user.userId,
        email: user.email,
        role: user.role,
        timezone: user.timezone,
      } as Record<string, unknown>,
      { expiresIn: this.accessTokenExpiry } as JwtSignOptions,
    );

    const refreshTokenId = randomUUID();
    const refreshToken = this.jwtService.sign(
      { sub: user.userId, type: 'refresh', jti: refreshTokenId },
      { expiresIn: this.refreshTokenExpiry } as JwtSignOptions,
    );
    const refreshTokenExpiresAt = this.getRefreshTokenExpiry(refreshToken);

    return {
      accessToken,
      refreshToken,
      refreshTokenId,
      refreshTokenExpiresAt,
    };
  }

  verifyRefreshToken(refreshToken: string): VerifiedRefreshToken {
    return this.jwtService.verify<VerifiedRefreshToken>(refreshToken);
  }

  private get accessTokenExpiry(): JwtSignOptions['expiresIn'] {
    return (this.configService.get<string>('JWT_EXPIRES_IN') ??
      '15m') as JwtSignOptions['expiresIn'];
  }

  private get refreshTokenExpiry(): JwtSignOptions['expiresIn'] {
    return (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ??
      '7d') as JwtSignOptions['expiresIn'];
  }

  private getRefreshTokenExpiry(refreshToken: string): Date {
    const payload = this.jwtService.decode(refreshToken) as DecodedRefreshToken | null;
    if (!payload?.exp) {
      throw new InternalServerErrorException('Refresh token expiry is missing');
    }

    return new Date(payload.exp * 1000);
  }
}
