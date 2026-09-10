import { Module } from '@nestjs/common';
import { ConfigurationModule } from '../configuration/configuration.module';
import { TrendsService } from './trends.service';
import { TrendsController } from './trends.controller';

@Module({
  imports: [ConfigurationModule],
  controllers: [TrendsController],
  providers: [TrendsService],
})
export class TrendsModule {}
