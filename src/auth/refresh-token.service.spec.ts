import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Connection, Model } from 'mongoose';
import { RefreshTokenService } from './refresh-token.service';
import { RefreshTokenDocument } from './schema/refresh-token.schema';
import { UnauthorizedException } from '@nestjs/common';

describe('RefreshTokenService', () => {
  it('revokes the presented session and creates its replacement in one transaction', async () => {
    const tokenHash = await bcrypt.hash('refresh-token', 4);
    const tokenSession = {
      _id: 'session-id',
      tokenHash,
      expiresAt: new Date(Date.now() + 60_000),
      familyId: 'family-id',
      revokedAt: null,
    };
    const findOneExec = jest.fn().mockResolvedValue(tokenSession);
    const querySession = jest.fn().mockReturnValue({ exec: findOneExec });
    const select = jest.fn().mockReturnValue({ session: querySession });
    const updateExec = jest.fn().mockResolvedValue(tokenSession);
    const model = {
      findOne: jest.fn().mockReturnValue({ select }),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: updateExec }),
      create: jest.fn().mockResolvedValue(undefined),
    } as unknown as Model<RefreshTokenDocument>;
    const transactionSession = {
      withTransaction: jest.fn(async (callback: () => Promise<void>) => callback()),
      endSession: jest.fn().mockResolvedValue(undefined),
    };
    const connection = {
      startSession: jest.fn().mockResolvedValue(transactionSession),
    } as unknown as Connection;
    const service = new RefreshTokenService(
      model,
      { get: jest.fn().mockReturnValue(4) } as unknown as ConfigService,
      connection,
    );

    await expect(
      service.rotateSession(
        '507f1f77bcf86cd799439011',
        'f07fdc23-a523-4f95-befc-9667f81911ab',
        'refresh-token',
        {
          refreshToken: 'replacement-token',
          jti: '9a4f0fbd-e1e5-47ca-aefe-2c4815789e86',
          expiresAt: new Date(Date.now() + 120_000),
        },
      ),
    ).resolves.toBeUndefined();

    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'session-id', revokedAt: null }),
      expect.objectContaining({
        $set: expect.objectContaining({ revokedReason: 'rotated' }),
      }),
      expect.objectContaining({ session: transactionSession }),
    );
    expect(model.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          familyId: 'family-id',
          jti: '9a4f0fbd-e1e5-47ca-aefe-2c4815789e86',
        }),
      ],
      { session: transactionSession },
    );
  });

  it('revokes the token family when a rotated token is replayed', async () => {
    const tokenHash = await bcrypt.hash('replayed-token', 4);
    const tokenSession = {
      _id: 'session-id',
      tokenHash,
      expiresAt: new Date(Date.now() + 60_000),
      familyId: 'family-id',
      revokedAt: new Date(),
      revokedReason: 'rotated',
    };
    const findOneExec = jest.fn().mockResolvedValue(tokenSession);
    const querySession = jest.fn().mockReturnValue({ exec: findOneExec });
    const select = jest.fn().mockReturnValue({ session: querySession });
    const model = {
      findOne: jest.fn().mockReturnValue({ select }),
      updateMany: jest.fn().mockResolvedValue(undefined),
    } as unknown as Model<RefreshTokenDocument>;
    const transactionSession = {
      withTransaction: jest.fn(async (callback: () => Promise<void>) => callback()),
      endSession: jest.fn().mockResolvedValue(undefined),
    };
    const service = new RefreshTokenService(
      model,
      {} as ConfigService,
      {
        startSession: jest.fn().mockResolvedValue(transactionSession),
      } as unknown as Connection,
    );

    await expect(
      service.rotateSession(
        '507f1f77bcf86cd799439011',
        'f07fdc23-a523-4f95-befc-9667f81911ab',
        'replayed-token',
        {
          refreshToken: 'replacement-token',
          jti: '9a4f0fbd-e1e5-47ca-aefe-2c4815789e86',
          expiresAt: new Date(Date.now() + 120_000),
        },
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(model.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: [{ familyId: 'family-id' }, { jti: 'family-id' }],
      }),
      expect.objectContaining({
        $set: expect.objectContaining({ revokedReason: 'replay-detected' }),
      }),
      { session: transactionSession },
    );
  });
});
