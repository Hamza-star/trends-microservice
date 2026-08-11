import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AreaService } from './areas.service';
import { AreaController } from './areas.controller';
import { Area, AreaSchema } from './schemas/area.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Area.name, schema: AreaSchema }])],
  controllers: [AreaController],
  providers: [AreaService],
})
export class AreasModule {}
