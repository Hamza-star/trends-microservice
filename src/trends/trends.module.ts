import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TrendsService } from './trends.service';
import { TrendsController } from './trends.controller';

@Module({
  imports: [AuthModule],
  controllers: [TrendsController],
  providers: [TrendsService],
})
export class TrendsModule {}
