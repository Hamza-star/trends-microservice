import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ConfigAdminGuard } from './config-admin.guard';
import { ConfigurationService } from './configuration.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Controller('projects')
@UseGuards(ConfigAdminGuard)
export class ProjectController {
  constructor(private readonly configurationService: ConfigurationService) {}

  @Post()
  create(@Body() dto: CreateProjectDto) {
    return this.configurationService.createProject(dto);
  }

  @Get()
  list() {
    return this.configurationService.listProjects();
  }

  @Get(':projectId')
  get(@Param('projectId') projectId: string) {
    return this.configurationService.getProject(projectId);
  }

  @Patch(':projectId')
  update(@Param('projectId') projectId: string, @Body() dto: UpdateProjectDto) {
    return this.configurationService.updateProject(projectId, dto);
  }

  @Delete(':projectId')
  remove(@Param('projectId') projectId: string) {
    return this.configurationService.deleteProject(projectId);
  }
}