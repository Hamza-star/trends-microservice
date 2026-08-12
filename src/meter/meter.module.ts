import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MeterController } from './meter.controller';
import { MeterService } from './meter.service';
import { Meter, MeterSchema } from './schemas/meter.schema';
import { Area, AreaSchema } from '../areas/schemas/area.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Meter.name, schema: MeterSchema },
      { name: Area.name, schema: AreaSchema },
    ]),
  ],
  controllers: [MeterController],
  providers: [MeterService],
  exports: [MeterService],
})
export class MeterModule {}