import { Module } from '@nestjs/common';
import { ConfigurationModule } from '../configuration/configuration.module';
import { AreaService } from './areas.service';
import { AreaController } from './areas.controller';

@Module({
  imports: [ConfigurationModule],
  controllers: [AreaController],
  providers: [AreaService],
})
export class AreasModule {}
