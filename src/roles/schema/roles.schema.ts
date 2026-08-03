import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RolesDocument = HydratedDocument<Roles>;

@Schema({ timestamps: true })
export class Roles {
  @Prop({ required: true, unique: true, trim: true })
  name!: string;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'Privelleges' }],
    default: [],
  })
  privelleges!: Types.ObjectId[];

  @Prop({ default: false })
  isAdmin!: boolean;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'Menu' }],
    default: [],
  })
  menuIds!: Types.ObjectId[];

  id?: any;
}

export const RolesSchema = SchemaFactory.createForClass(Roles);
