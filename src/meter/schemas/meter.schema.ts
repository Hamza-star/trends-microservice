import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  versionKey: false,
})
export class Meter extends Document {
  @Prop({ required: true, trim: true })
  meterName!: string;

  @Prop({ required: true, trim: true, index: true })
  uniqueKey!: string;

  @Prop({ type: Types.ObjectId, ref: 'Area', required: true, index: true })
  area!: Types.ObjectId;

  @Prop({ trim: true })
  infoText?: string;

  @Prop({ default: true })
  status?: boolean;

  @Prop({ type: Date, default: Date.now })
  createdAt!: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt!: Date;
}

export const MeterSchema = SchemaFactory.createForClass(Meter);

// Indexes for better performance
MeterSchema.index({ uniqueKey: 1 });
MeterSchema.index({ area: 1, status: 1 });
MeterSchema.index({ meterName: 'text' });