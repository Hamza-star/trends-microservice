import { Types } from 'mongoose';
import { alarmsConfiguration } from '../schema/alarmsConfig.schema';
import { AlarmRulesSet } from '../schema/alarmsTriggerConfig.schema';
import { AlarmsType } from '../schema/alarmsType.schema';
import { Threshold } from '../schema/threshold.schema';

export type PayloadMap = Record<string, number>;

export type AlarmConfigDocument = alarmsConfiguration & {
  _id: Types.ObjectId;
  alarmTypeId?: AlarmsType | Types.ObjectId;
  alarmTriggerConfig?: AlarmRulesSet | Types.ObjectId;
};

export type TriggeredAlarmThreshold = {
  threshold?: Threshold;
  value?: number;
  location?: string;
  device?: string;
  parameter?: string;
};

export type LogicUpdatePayload = {
  alarmLocation: string;
  alarmSubLocation?: string;
  alarmDevice?: string;
  alarmParameter: string;
  thresholds?: Threshold[];
};

export interface LogicEvaluationStatus {
  alarmLocation: string;
  alarmSubLocation?: string;
  alarmDevice?: string;
  alarmParameter: string;
  value?: number;
  threshold?: Threshold;
  isTriggered: boolean;
}

export interface TriggeredAlarmResponse {
  alarmOccurrenceId: string | Types.ObjectId;
  alarmOccurenceId: string | Types.ObjectId;
  alarmName: string;
  alarmStatus: boolean;
  alarmType?: string;
  priority?: number;
  triggeredAt: Date;
  snooze: boolean;
  alarmAcknowledgeStatus?: string;
  thresholds: TriggeredAlarmThreshold[];
};