import { Module } from '@nestjs/common';
import { ConfigurationModule } from '../configuration/configuration.module';
import { MeterController } from './meter.controller';
import { MeterService } from './meter.service';

@Module({
  imports: [
    ConfigurationModule,
  ],
  controllers: [MeterController],
  providers: [MeterService],
  exports: [MeterService],
})
export class MeterModule {}