import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenService } from './refresh-token.service';
import { AuthTokenService } from './auth-token.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(10) } },
        { provide: RefreshTokenService, useValue: {} },
        { provide: AuthTokenService, useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('generates 10 backup codes upon user signup and returns them', async () => {
    const usersService = {
      findByEmail: jest.fn().mockResolvedValue(null),
      resolveDefaultRoleId: jest.fn().mockResolvedValue('roleId123'),
      registerUser: jest.fn().mockResolvedValue({ id: '507f1f77bcf86cd799439011' }),
      saveBackupCodes: jest.fn().mockResolvedValue(undefined),
    } as unknown as UsersService;

    const configService = {
      get: jest.fn().mockReturnValue(10),
    } as unknown as ConfigService;

    const authService = new AuthService(
      usersService,
      configService,
      {} as RefreshTokenService,
      {} as AuthTokenService,
    );

    const result = await authService.signup('newuser@example.com', 'ValidPass123!');

    expect(result.message).toBe('Signup Successfull');
    expect(result.backupCodes).toHaveLength(10);
    expect(usersService.saveBackupCodes).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      result.backupCodes,
    );
  });

  describe('forgotPasswordWithBackupCode', () => {
    it('throws BadRequestException if user is not found', async () => {
      const usersService = {
        findByEmail: jest.fn().mockResolvedValue(null),
      } as unknown as UsersService;

      const authService = new AuthService(
        usersService,
        {} as ConfigService,
        {} as RefreshTokenService,
        {} as AuthTokenService,
      );

      await expect(
        authService.forgotPasswordWithBackupCode({
          email: 'unknown@example.com',
          backupCode: '12345678',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow('Invalid email or backup code');
    });

    it('throws BadRequestException if backup code is invalid or already used', async () => {
      const mockUser = {
        email: 'user@example.com',
        backupCodes: [{ code: '12345678', used: true, usedAt: new Date() }],
      };
      const usersService = {
        findByEmail: jest.fn().mockResolvedValue(mockUser),
      } as unknown as UsersService;

      const authService = new AuthService(
        usersService,
        {} as ConfigService,
        {} as RefreshTokenService,
        {} as AuthTokenService,
      );

      await expect(
        authService.forgotPasswordWithBackupCode({
          email: 'user@example.com',
          backupCode: '12345678',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow('Invalid or already used backup code');
    });

    it('resets password successfully when valid unused backup code is provided', async () => {
      const mockUser: any = {
        _id: '507f1f77bcf86cd799439011',
        email: 'user@example.com',
        backupCodes: [
          { code: '84920153', used: false, usedAt: null },
          { code: '91028374', used: false, usedAt: null },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      const usersService = {
        findByEmail: jest.fn().mockResolvedValue(mockUser),
      } as unknown as UsersService;

      const refreshTokenService = {
        revokeAllUserSessions: jest.fn().mockResolvedValue(1),
      } as unknown as RefreshTokenService;

      const configService = {
        get: jest.fn().mockReturnValue(10),
      } as unknown as ConfigService;

      const authService = new AuthService(
        usersService,
        configService,
        refreshTokenService,
        {} as AuthTokenService,
      );

      const response = await authService.forgotPasswordWithBackupCode({
        email: 'user@example.com',
        backupCode: '84920153',
        newPassword: 'NewPassword123!',
      });

      expect(response.message).toBe('Password reset successfully');
      expect(mockUser.backupCodes[0].used).toBe(true);
      expect(mockUser.backupCodes[0].usedAt).toBeDefined();
      expect(mockUser.save).toHaveBeenCalled();
      expect(refreshTokenService.revokeAllUserSessions).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
    });
  });

  it('rejects an inactive user before rotating the refresh-token session', async () => {
    const usersService = {
      findAuthUserById: jest.fn().mockResolvedValue({
        id: '507f1f77bcf86cd799439011',
        userStatus: 'inactive',
      }),
    } as unknown as UsersService;
    const refreshTokenService = {
      rotateSession: jest.fn().mockResolvedValue(undefined),
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
    expect(refreshTokenService.rotateSession).not.toHaveBeenCalled();
  });

  it('revokes the current refresh-token session during logout', async () => {
    const refreshTokenService = {
      revokeCurrentSession: jest.fn().mockResolvedValue(undefined),
    } as unknown as RefreshTokenService;
    const authTokenService = {
      verifyRefreshToken: jest.fn().mockReturnValue({
        sub: '507f1f77bcf86cd799439011',
        type: 'refresh',
        jti: 'f07fdc23-a523-4f95-befc-9667f81911ab',
      }),
    } as unknown as AuthTokenService;
    const authService = new AuthService(
      {} as UsersService,
      {} as ConfigService,
      refreshTokenService,
      authTokenService,
    );

    await expect(authService.logout('refresh-token')).resolves.toBeUndefined();
    expect(refreshTokenService.revokeCurrentSession).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      'f07fdc23-a523-4f95-befc-9667f81911ab',
      'refresh-token',
    );
  });

  it('delegates logout-all to the refresh-token session service', async () => {
    const refreshTokenService = {
      revokeAllUserSessions: jest.fn().mockResolvedValue(2),
    } as unknown as RefreshTokenService;
    const authService = new AuthService(
      {} as UsersService,
      {} as ConfigService,
      refreshTokenService,
      {} as AuthTokenService,
    );

    await expect(
      authService.logoutAllDevices('507f1f77bcf86cd799439011'),
    ).resolves.toBe(2);
    expect(refreshTokenService.revokeAllUserSessions).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
    );
  });
});
