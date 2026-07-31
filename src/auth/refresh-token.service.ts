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
  ): Promise<void> {
    const saltRounds = Number(
      this.configService.get<string>('BCRYPT_SALT_ROUNDS') ?? 10,
    );
    const tokenHash = await bcrypt.hash(refreshToken, saltRounds);

    try {
      await this.refreshTokenModel.create({
        userId: new Types.ObjectId(userId),
        tokenHash,
        jti,
        familyId,
        expiresAt,
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
    },
  ): Promise<void> {
    const databaseSession = await this.connection.startSession();
    let replayDetected = false;

    try {
      await databaseSession.withTransaction(async () => {
        const now = new Date();
        const session = await this.refreshTokenModel
          .findOne({ userId: new Types.ObjectId(userId), jti })
          .select('+tokenHash')
          .session(databaseSession)
          .exec();

        if (!session) {
          throw new UnauthorizedException('Invalid refresh token');
        }

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
              databaseSession,
            );
            replayDetected = true;
            return;
          }

          throw new UnauthorizedException('Invalid refresh token');
        }

        const revokedSession = await this.refreshTokenModel
          .findOneAndUpdate(
            { _id: session._id, revokedAt: null, expiresAt: { $gt: now } },
            { $set: { revokedAt: now, revokedReason: 'rotated' } },
            { new: true, session: databaseSession },
          )
          .exec();

        if (!revokedSession) {
          await this.revokeFamily(
            userId,
            familyId,
            now,
            'replay-detected',
            databaseSession,
          );
          replayDetected = true;
          return;
        }

        const replacementHash = await bcrypt.hash(
          replacement.refreshToken,
          this.getSaltRounds(),
        );
        await this.refreshTokenModel.create(
          [
            {
              userId: new Types.ObjectId(userId),
              tokenHash: replacementHash,
              jti: replacement.jti,
              familyId,
              expiresAt: replacement.expiresAt,
            },
          ],
          { session: databaseSession },
        );
      });
    } finally {
      await databaseSession.endSession();
    }

    if (replayDetected) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async revokeCurrentSession(
    userId: string,
    jti: string,
    presentedRefreshToken: string,
  ): Promise<void> {
    const databaseSession = await this.connection.startSession();

    try {
      await databaseSession.withTransaction(async () => {
        const tokenSession = await this.refreshTokenModel
          .findOne({ userId: new Types.ObjectId(userId), jti })
          .select('+tokenHash')
          .session(databaseSession)
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
          databaseSession,
        );
      });
    } finally {
      await databaseSession.endSession();
    }
  }

  private async revokeFamily(
    userId: string,
    familyId: string,
    revokedAt: Date,
    revokedReason: 'logout' | 'replay-detected',
    databaseSession: ClientSession,
  ): Promise<void> {
    await this.refreshTokenModel.updateMany(
      {
        userId: new Types.ObjectId(userId),
        revokedAt: null,
        $or: [{ familyId }, { jti: familyId }],
      },
      { $set: { revokedAt, revokedReason } },
      { session: databaseSession },
    );
  }

  private getSaltRounds(): number {
    return Number(this.configService.get<string>('BCRYPT_SALT_ROUNDS') ?? 10);
  }
}
