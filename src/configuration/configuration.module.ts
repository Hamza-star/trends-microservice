import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfigAdminGuard } from './config-admin.guard';
import { ConfigCacheService } from './config-cache.service';
import { CollectionController } from './collection.controller';
import { ConfigurationService } from './configuration.service';
import { ProjectController } from './project.controller';
import { ProjectConfigService } from './project-config.service';

@Module({
  imports: [ConfigModule],
  controllers: [ProjectController, CollectionController],
  providers: [
    ConfigAdminGuard,
    ConfigCacheService,
    ConfigurationService,
    ProjectConfigService,
  ],
  exports: [ProjectConfigService],
})
export class ConfigurationModule {}