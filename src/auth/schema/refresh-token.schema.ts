import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Users } from '../../users/schema/users.schema';

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

@Schema({ collection: 'refresh_tokens', timestamps: true })
export class RefreshToken {
  @Prop({ type: Types.ObjectId, ref: Users.name, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, select: false })
  tokenHash!: string;

  @Prop({ required: true, unique: true, sparse: true })
  jti!: string;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ type: Date, default: null })
  revokedAt?: Date | null;

  @Prop({ type: String, default: null })
  revokedReason?: string | null;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

// MongoDB removes expired sessions automatically. Expiry enforcement will be
// performed by refresh-token validation in the next implementation step.
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
