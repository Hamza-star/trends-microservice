import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenService } from './refresh-token.service';
import { AuthTokenService } from './auth-token.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: {} },
        { provide: ConfigService, useValue: {} },
        { provide: RefreshTokenService, useValue: {} },
        { provide: AuthTokenService, useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects an inactive user after validating the refresh-token session', async () => {
    const usersService = {
      findAuthUserById: jest.fn().mockResolvedValue({
        id: '507f1f77bcf86cd799439011',
        userStatus: 'inactive',
      }),
    } as unknown as UsersService;
    const refreshTokenService = {
      validateSession: jest.fn().mockResolvedValue(undefined),
    } as unknown as RefreshTokenService;
    const authTokenService = {
      verifyRefreshToken: jest.fn().mockReturnValue({
        sub: '507f1f77bcf86cd799439011',
        type: 'refresh',
        jti: 'f07fdc23-a523-4f95-befc-9667f81911ab',
      }),
    } as unknown as AuthTokenService;
    const authService = new AuthService(
      usersService,
      {} as ConfigService,
      refreshTokenService,
      authTokenService,
    );

    await expect(authService.refreshTokens('refresh-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(refreshTokenService.validateSession).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      'f07fdc23-a523-4f95-befc-9667f81911ab',
      'refresh-token',
    );
  });
});
