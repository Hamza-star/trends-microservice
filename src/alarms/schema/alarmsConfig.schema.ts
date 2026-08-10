import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { AlarmRulesSet } from "./alarmsTriggerConfig.schema";
import { Logic } from "./logic.schema";
import { LogicConfiguration } from "./logic-configuration.schema";

@Schema({ collection: "alarmsConfiguration" })
export class alarmsConfiguration {
  @Prop({ type: Types.ObjectId, ref: "AlarmsType", required: true })
  alarmTypeId: Types.ObjectId;

  @Prop({ required: true })
  alarmName: string;

  @Prop({ type: [Logic], required: true })
  Logics: Logic[];

  @Prop({ type: LogicConfiguration, required: true })
  LogicConfiguration: LogicConfiguration;

  @Prop({ type: [String], default: [] })
  acknowledgementActions: string[];

  @Prop({ type: Types.ObjectId, ref: "AlarmRulesSet", required: true })
  alarmTriggerConfig: AlarmRulesSet | Types.ObjectId;
}

export type AlarmsDocument = alarmsConfiguration & Document;
export const AlarmsConfigurationSchema =
  SchemaFactory.createForClass(alarmsConfiguration);