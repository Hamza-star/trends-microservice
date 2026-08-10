// Updated alarm-occurrence.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Logic Status Sub-schema
@Schema({ _id: false, timestamps: true } )
export class LogicStatus {
  @Prop({ required: true })
  alarmLocation: string;

  @Prop()
  alarmSubLocation: string;

  @Prop()
  alarmDevice: string;

  @Prop({ required: true })
  alarmParameter: string;

  @Prop({ required: true })
  isTriggered: boolean;

  @Prop({ required: false })
  value?: number;

  @Prop({ type: { value: Number, operator: String }, required: false })
  threshold?: {
    value: number;
    operator: string;
  };

  @Prop()
  resolveTime?: Date;
}

export const LogicStatusSchema = SchemaFactory.createForClass(LogicStatus);

// Main Alarm Occurrence Schema - SIMPLIFIED
@Schema({ collection: 'alarmsOccurrence', timestamps: true })
export class AlarmOccurrence {
  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ required: true })
  alarmID: string;

  @Prop({ type: Boolean, default: false })
  alarmStatus: boolean;

  // ✅ Link to config
  @Prop({ type: Types.ObjectId, ref: 'alarmsConfiguration' })
  alarmConfigId: Types.ObjectId;

  // ✅ Link to ruleset (for persistence time, occursCount)
  @Prop({ type: Types.ObjectId, ref: 'AlarmRulesSet' })
  alarmRulesetId: Types.ObjectId | null;

  // ✅ Link to alarm type
  @Prop({ type: Types.ObjectId, ref: 'AlarmsType' })
  alarmTypeId: Types.ObjectId | null;

  // ✅ Store ALL logics with their status - THIS IS THE MAIN DATA NOW
  @Prop({ type: [LogicStatusSchema], required: true })
  logicStatuses: LogicStatus[];

  @Prop({
    type: String,
    enum: ['Acknowledged', 'Unacknowledged'],
    default: 'Unacknowledged',
  })
  alarmAcknowledgeStatus: 'Acknowledged' | 'Unacknowledged';

  @Prop({ type: String, default: '' })
  alarmAcknowledgmentAction: string;

  @Prop({ type: Types.ObjectId, ref: 'Users' })
  alarmAcknowledgedBy: Types.ObjectId | null;

  @Prop({ type: Number, default: 0 })
  alarmAcknowledgedDelay: number;

  @Prop({ type: Number, default: 0 })
  alarmAge: number;

  @Prop({ type: Number, default: 0 })
  alarmDuration: number;

  @Prop({ type: String })
  alarmAcknowledgmentType: 'Single' | 'Both' | null;

  @Prop({ type: Boolean, default: false })
  alarmSnooze: boolean;

  @Prop({ type: Date })
  snoozeAt: Date;

  @Prop({ type: Number })
  snoozeDuration: number;

  @Prop({ type: Date })
  resolveTime?: Date;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;

  // Timestamps are automatically added by { timestamps: true }
  // createdAt and updatedAt fields are auto-managed
}

export type AlarmsOccurrenceDocument = AlarmOccurrence & Document;
export const AlarmsOccurrenceSchema =
  SchemaFactory.createForClass(AlarmOccurrence);

// Keep your indexes
AlarmsOccurrenceSchema.index(
  { alarmConfigId: 1, alarmStatus: 1 },
  { 
    unique: true, 
    partialFilterExpression: { alarmStatus: true },
    name: 'unique_active_alarm_per_config'
  },
);

AlarmsOccurrenceSchema.index({ date: -1 });
AlarmsOccurrenceSchema.index({ alarmTypeId: 1 });
AlarmsOccurrenceSchema.index({ alarmAcknowledgeStatus: 1 });
AlarmsOccurrenceSchema.index({ alarmConfigId: 1, date: -1 });