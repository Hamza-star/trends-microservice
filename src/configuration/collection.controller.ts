import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ConfigAdminGuard } from './config-admin.guard';
import { ConfigurationService } from './configuration.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';

@Controller('projects/:projectId/collections')
@UseGuards(ConfigAdminGuard)
export class CollectionController {
  constructor(private readonly configurationService: ConfigurationService) {}

  @Post()
  create(@Param('projectId') projectId: string, @Body() dto: CreateCollectionDto) {
    return this.configurationService.createCollection(projectId, dto);
  }

  @Get()
  list(@Param('projectId') projectId: string) {
    return this.configurationService.listCollections(projectId);
  }

  @Patch(':collectionId')
  update(
    @Param('projectId') projectId: string,
    @Param('collectionId') collectionId: string,
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.configurationService.updateCollection(projectId, collectionId, dto);
  }

  @Delete(':collectionId')
  remove(@Param('projectId') projectId: string, @Param('collectionId') collectionId: string) {
    return this.configurationService.deleteCollection(projectId, collectionId);
  }
}