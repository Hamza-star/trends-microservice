import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RolesDocument = HydratedDocument<Roles>;

@Schema({ timestamps: true })
export class Roles {
  @Prop({ required: true, unique: true, trim: true })
  name!: string;

  @Prop({ type: [String], default: [] })
  permissions!: string[];

  @Prop({ default: false })
  isSystem!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Users', default: null })
  createdBy?: Types.ObjectId | null;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'Menu' }],
    default: [],
  })
  menuIds!: Types.ObjectId[];

  id?: any;
}

export const RolesSchema = SchemaFactory.createForClass(Roles);
