import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { ConfigCacheService } from './config-cache.service';
import { Project, ProjectSchema } from './schemas/project.schema';
import { ProjectCollection, ProjectCollectionSchema } from './schemas/collection.schema';

export interface ProjectConfig {
  projectId: string;
  databaseName: string;
  collections: string[];
}

@Injectable()
export class ProjectConfigService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    private readonly configService: ConfigService,
    private readonly cache: ConfigCacheService,
  ) {}

  async getProjectConfig(projectId: string): Promise<ProjectConfig> {
    const cached = this.cache.get(projectId);
    if (cached) {
      return cached;
    }

    const { projectModel, collectionModel } = this.models();
    const project = await projectModel.findOne({ projectId }).lean().exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (!project.isActive) {
      throw new ForbiddenException('Project is inactive');
    }

    const collections = await collectionModel
      .find({ projectId, isActive: true })
      .select({ collectionName: 1, _id: 0 })
      .lean()
      .exec();

    if (!collections.length) {
      throw new NotFoundException('No active collections configured for project');
    }

    const resolved: ProjectConfig = {
      projectId: project.projectId,
      databaseName: project.databaseName,
      collections: collections.map(({ collectionName }) => collectionName),
    };
    this.cache.set(projectId, resolved);
    return resolved;
  }

  async getProjectDatabase(projectId: string): Promise<Connection> {
    const project = await this.getProjectConfig(projectId);
    return this.connection.useDb(project.databaseName, { useCache: true });
  }

  invalidate(projectId: string): void {
    this.cache.invalidate(projectId);
  }

  private models(): {
    projectModel: Model<Project>;
    collectionModel: Model<ProjectCollection>;
  } {
    const db = this.connection.useDb(
      this.configService.getOrThrow<string>('configuration.databaseName'),
      { useCache: true },
    );
    const projectModel = db.models[Project.name]
      ? db.models[Project.name] as Model<Project>
      : db.model(Project.name, ProjectSchema);
    const collectionModel = db.models[ProjectCollection.name]
      ? db.models[ProjectCollection.name] as Model<ProjectCollection>
      : db.model(ProjectCollection.name, ProjectCollectionSchema);

    return { projectModel, collectionModel };
  }
}