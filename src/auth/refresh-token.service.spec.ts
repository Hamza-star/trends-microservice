import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { RefreshTokenService } from './refresh-token.service';
import { RefreshTokenDocument } from './schema/refresh-token.schema';

describe('RefreshTokenService', () => {
  it('accepts a matching, active refresh-token session', async () => {
    const token = 'refresh-token';
    const tokenHash = await bcrypt.hash(token, 4);
    const exec = jest.fn().mockResolvedValue({ tokenHash });
    const select = jest.fn().mockReturnValue({ exec });
    const model = {
      findOne: jest.fn().mockReturnValue({ select }),
    } as unknown as Model<RefreshTokenDocument>;
    const service = new RefreshTokenService(
      model,
      {} as ConfigService,
    );

    await expect(
      service.validateSession(
        '507f1f77bcf86cd799439011',
        'f07fdc23-a523-4f95-befc-9667f81911ab',
        token,
      ),
    ).resolves.toBeUndefined();

    expect(model.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        jti: 'f07fdc23-a523-4f95-befc-9667f81911ab',
        revokedAt: null,
        expiresAt: { $gt: expect.any(Date) },
      }),
    );
    expect(select).toHaveBeenCalledWith('+tokenHash');
  });
});
