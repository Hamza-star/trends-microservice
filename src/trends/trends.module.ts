import { Module } from '@nestjs/common';
import { ConfigurationModule } from '../configuration/configuration.module';
import { TrendsService } from './trends.service';
import { TrendsController } from './trends.controller';
import { TrendsCacheService } from './trends-cache.service';

@Module({
  imports: [ConfigurationModule],
  controllers: [TrendsController],
  providers: [TrendsService, TrendsCacheService],
})
export class TrendsModule {}
