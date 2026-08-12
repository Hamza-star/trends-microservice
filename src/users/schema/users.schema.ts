import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
export type UsersDocument = HydratedDocument<Users>;

@Schema({ timestamps: true })
export class Users {
  @Prop({ enum: ['active', 'inactive', 'banned'], default: 'active' })
  userStatus!: string;

  @Prop({ type: Types.ObjectId, ref: 'Roles', required: true })
  role!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Users', default: null })
  createdBy?: Types.ObjectId | null;

  @Prop({ trim: true })
  name?: string;

  @Prop({
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
  })
  email!: string;

  @Prop({ required: true })
  password!: string;

  @Prop({
    type: [
      {
        code: { type: String, required: true },
        used: { type: Boolean, default: false },
        usedAt: { type: Date, default: null },
      },
    ],
    default: [],
  })
  backupCodes?: Array<{ code: string; used: boolean; usedAt?: Date | null }>;

  @Prop({ default: Date.now })
  createdAt!: Date;

  @Prop({ default: Date.now })
  updatedAt!: Date;

  id?: any;
  populate?: any;
}

export const UsersSchema = SchemaFactory.createForClass(Users);
