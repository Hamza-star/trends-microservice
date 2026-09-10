// schemas/meter.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  versionKey: false,
})
export class Meter extends Document {
  @Prop({ required: true, trim: true })
  meterName!: string;

  @Prop({ required: false, trim: true, index: true, default: '' })
  uniqueKey?: string;

  @Prop({ type: Types.ObjectId, ref: 'Area', required: false, default: null })
  area!: Types.ObjectId | null;

  @Prop({ trim: true, default: '' })
  infoText?: string;

  @Prop({ default: true })
  status?: boolean;

  @Prop({ trim: true, required: true })
  key!: string;

  @Prop({ type: Date, default: Date.now })
  createdAt!: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt!: Date;
}

export const MeterSchema = SchemaFactory.createForClass(Meter);