import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthTokenService } from './auth-token.service';

describe('AuthTokenService', () => {
  it('issues a unique refresh-token identifier and uses it as the JWT jti claim', () => {
    const jwtService = {
      sign: jest.fn().mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token'),
      decode: jest.fn().mockReturnValue({ exp: 1_800_000_000 }),
    } as unknown as JwtService;
    const configService = {
      get: jest.fn((key: string) =>
        key === 'JWT_EXPIRES_IN' ? '15m' : '7d',
      ),
    } as unknown as ConfigService;
    const service = new AuthTokenService(jwtService, configService);

    const tokens = service.issueTokenPair({
      userId: '507f1f77bcf86cd799439011',
      email: 'user@example.com',
      role: 'role-id',
      timezone: 'Asia/Karachi',
    });

    expect(tokens.refreshTokenId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(jwtService.sign).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        sub: '507f1f77bcf86cd799439011',
        type: 'refresh',
        jti: tokens.refreshTokenId,
      }),
      { expiresIn: '7d' },
    );
    expect(tokens.refreshTokenExpiresAt).toEqual(
      new Date(1_800_000_000 * 1000),
    );
  });
});
