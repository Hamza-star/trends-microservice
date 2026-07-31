import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';
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
  ) {}

  async createSession(
    userId: string,
    refreshToken: string,
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
        expiresAt,
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Unable to create refresh token session',
        { cause: error },
      );
    }
  }
}
