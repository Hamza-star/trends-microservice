import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import {
  RefreshToken,
  RefreshTokenDocument,
} from './schema/refresh-token.schema';

export interface RefreshTokenSessionMetadata {
  ipAddress?: string;
  userAgent?: string;
  deviceName?: string;
}

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,
    private readonly configService: ConfigService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async createSession(
    userId: string,
    refreshToken: string,
    jti: string,
    familyId: string,
    expiresAt: Date,
    metadata: RefreshTokenSessionMetadata = {},
  ): Promise<void> {
    const saltRounds = Number(
      this.configService.get<string>('BCRYPT_SALT_ROUNDS') ?? 10,
    );
    const tokenHash = await bcrypt.hash(refreshToken, saltRounds);
    const sessionMetadata = this.normalizeMetadata(metadata);

    try {
      await this.refreshTokenModel.create({
        userId: new Types.ObjectId(userId),
        tokenHash,
        jti,
        familyId,
        expiresAt,
        ipAddress: sessionMetadata.ipAddress,
        lastIpAddress: sessionMetadata.ipAddress,
        userAgent: sessionMetadata.userAgent,
        deviceName: sessionMetadata.deviceName,
        lastUsedAt: new Date(),
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Unable to create refresh token session',
        { cause: error },
      );
    }
  }

 async rotateSession(
  userId: string,
  jti: string,
  presentedRefreshToken: string,
  replacement: {
    refreshToken: string;
    jti: string;
    expiresAt: Date;
    metadata: RefreshTokenSessionMetadata;
  },
): Promise<void> {
  try {
    const now = new Date();
    
    // Find session
    const session = await this.refreshTokenModel
      .findOne({ userId: new Types.ObjectId(userId), jti })
      .select('+tokenHash')
      .exec();

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Validate token
    const matchesStoredHash = await bcrypt.compare(
      presentedRefreshToken,
      session.tokenHash,
    );
    if (!matchesStoredHash || session.expiresAt <= now) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const familyId = session.familyId ?? session.jti;
    
    if (session.revokedAt) {
      if (session.revokedReason === 'rotated') {
        await this.revokeFamily(
          userId,
          familyId,
          now,
          'replay-detected',
          null,
        );
        throw new UnauthorizedException('Invalid refresh token');
      }
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Revoke old session
    const revokedSession = await this.refreshTokenModel
      .findOneAndUpdate(
        { _id: session._id, revokedAt: null, expiresAt: { $gt: now } },
        { $set: { revokedAt: now, revokedReason: 'rotated' } },
        { returnDocument: 'after' },
      )
      .exec();

    if (!revokedSession) {
      await this.revokeFamily(
        userId,
        familyId,
        now,
        'replay-detected',
        null,
      );
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Create new session
    const replacementHash = await bcrypt.hash(
      replacement.refreshToken,
      this.getSaltRounds(),
    );
    const sessionMetadata = this.normalizeMetadata(replacement.metadata);
    await this.refreshTokenModel.create({
      userId: new Types.ObjectId(userId),
      tokenHash: replacementHash,
      jti: replacement.jti,
      familyId,
      expiresAt: replacement.expiresAt,
      ipAddress: session.ipAddress ?? sessionMetadata.ipAddress,
      lastIpAddress: sessionMetadata.ipAddress ?? session.lastIpAddress,
      userAgent: sessionMetadata.userAgent ?? session.userAgent,
      deviceName: sessionMetadata.deviceName ?? session.deviceName,
      lastUsedAt: now,
    });
  } catch (error) {
    if (error instanceof UnauthorizedException) {
      throw error;
    }
    throw new InternalServerErrorException('Failed to rotate refresh token');
  }
}

async revokeCurrentSession(
  userId: string,
  jti: string,
  presentedRefreshToken: string,
): Promise<void> {
  try {
    const tokenSession = await this.refreshTokenModel
      .findOne({ userId: new Types.ObjectId(userId), jti })
      .select('+tokenHash')
      .exec();

    if (!tokenSession) {
      return;
    }

    const matchesStoredHash = await bcrypt.compare(
      presentedRefreshToken,
      tokenSession.tokenHash,
    );
    if (!matchesStoredHash) {
      return;
    }

    await this.revokeFamily(
      userId,
      tokenSession.familyId ?? tokenSession.jti,
      new Date(),
      'logout',
      null!,
    );
  } catch (error) {
    throw new InternalServerErrorException('Failed to revoke current session');
  }
}

 async revokeAllUserSessions(userId: string): Promise<number> {
  try {
    const result = await this.refreshTokenModel.updateMany(
      {
        userId: new Types.ObjectId(userId),
        revokedAt: null,
      },
      { $set: { revokedAt: new Date(), revokedReason: 'logout-all' } },
    );
    return result.modifiedCount || 0;
  } catch (error) {
    throw new InternalServerErrorException('Failed to revoke all sessions');
  }
}

private async revokeFamily(
  userId: string,
  familyId: string,
  revokedAt: Date,
  revokedReason: 'logout' | 'replay-detected',
  databaseSession: ClientSession | null,
): Promise<void> {
  const filter = {
    userId: new Types.ObjectId(userId),
    revokedAt: null,
    $or: [{ familyId }, { jti: familyId }],
  };
  
  const update = {
    $set: { revokedAt, revokedReason },
  };

  if (databaseSession) {
    await this.refreshTokenModel.updateMany(
      filter,
      update,
      { session: databaseSession },
    );
  } else {
    await this.refreshTokenModel.updateMany(
      filter,
      update,
    );
  }
}

  private getSaltRounds(): number {
    return Number(this.configService.get<string>('BCRYPT_SALT_ROUNDS') ?? 10);
  }

  private normalizeMetadata(
    metadata: RefreshTokenSessionMetadata,
  ): RefreshTokenSessionMetadata {
    return {
      ipAddress: metadata.ipAddress?.slice(0, 45),
      userAgent: metadata.userAgent?.slice(0, 512),
      deviceName: metadata.deviceName?.trim().slice(0, 100),
    };
  }
}
