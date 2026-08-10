import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class Threshold {
  @Prop({ required: true })
  value: number;

  @Prop({ enum: ['>', '<', '>=', '<=', '==', '!='], required: true })
  operator: string;
}

export const ThresholdSchema = SchemaFactory.createForClass(Threshold);