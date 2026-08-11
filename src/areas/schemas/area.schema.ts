import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ 
  timestamps: true,
  versionKey: false 
})!
export class Area extends Document {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: Types.ObjectId, ref: 'Area', default: null, index: true })
  parentId!: Types.ObjectId | null;

  @Prop({ required: true, default: 0 })
  level!: number;

  @Prop({ type: [String], required: true })
  path!: string[];

  @Prop({ type: Date, default: Date.now })
  createdAt!: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt!: Date;
}

export const AreaSchema = SchemaFactory.createForClass(Area);

// Indexes for better performance
AreaSchema.index({ parentId: 1, level: 1 });
AreaSchema.index({ path: 1 });