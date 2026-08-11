import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'alarmsRuleSet' })
export class AlarmRulesSet {
  _id?: Types.ObjectId; // - Add this back
  @Prop() 
  persistenceTime?: number;
  
  @Prop() 
  occursCount?: number;
  
  @Prop() 
  occursWithin?: number;
  
  @Prop({ enum: ['&&', '||', '', 'null'] })
  conditionType!: '&&' | '||' | '' | 'null';
  
  // thresholds removed from here since it's now in Logic schema
}

export type AlarmRulesSetDocument = AlarmRulesSet & Document;
export const AlarmRulesSetSchema = SchemaFactory.createForClass(AlarmRulesSet);