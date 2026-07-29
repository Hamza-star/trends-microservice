import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PrivellegesDocument = HydratedDocument<Privelleges>;

@Schema({ timestamps: true })
export class Privelleges {
  @Prop({ required: true, unique: true, trim: true })
  name!: string;

  id?: any;
}
export const PrivellegesSchema = SchemaFactory.createForClass(Privelleges);
