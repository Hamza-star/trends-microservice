import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class LogicConfiguration {
  @Prop()
  'All-True': boolean;

  @Prop()
  AnyOneTrue: boolean;
}

export const LogicConfigurationSchema = SchemaFactory.createForClass(LogicConfiguration);