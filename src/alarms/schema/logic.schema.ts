import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Threshold } from './threshold.schema';

@Schema({ _id: false })
export class Logic {
  @Prop({ required: true })
  alarmLocation!: string;

  @Prop()
  alarmSubLocation?: string;

  @Prop()
  alarmDevice?: string;

  @Prop({ required: true })
  alarmParameter!: string;

  @Prop({ type: [Threshold], required: true })
  thresholds!: Threshold[];
}

export const LogicSchema = SchemaFactory.createForClass(Logic);