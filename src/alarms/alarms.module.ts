import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AlarmsController } from './alarms.controller';
import { AlarmsService } from './alarms.service';
import {
  AlarmOccurrence,
  AlarmsOccurrenceSchema,
} from './schema/alarmOccurences.schema';
import {
  alarmsConfiguration,
  AlarmsConfigurationSchema,
} from './schema/alarmsConfig.schema';
import { Alarms, AlarmsSchema } from './schema/alarmsModel.schema';
import {
  AlarmRulesSet,
  AlarmRulesSetSchema,
} from './schema/alarmsTriggerConfig.schema';
import { AlarmsType, AlarmsTypeSchema } from './schema/alarmsType.schema';
import { UsersSchema } from 'src/users/schema/users.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: AlarmsType.name, schema: AlarmsTypeSchema },
      { name: alarmsConfiguration.name, schema: AlarmsConfigurationSchema },
      { name: AlarmRulesSet.name, schema: AlarmRulesSetSchema },
      { name: Alarms.name, schema: AlarmsSchema },
      { name: AlarmOccurrence.name, schema: AlarmsOccurrenceSchema },
      { name: 'Users', schema: UsersSchema }, 
    ]),
  ],
  controllers: [AlarmsController],
  providers: [AlarmsService],
  exports: [AlarmsService],
})
export class AlarmsModule {}
