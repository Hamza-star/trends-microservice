import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ServiceAuthGuard } from './auth.guard';

@Module({
  providers: [AuthService, ServiceAuthGuard],
  exports: [AuthService, ServiceAuthGuard],
})
export class AuthModule {}