import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { ConfigCacheService } from './config-cache.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectCollection, ProjectCollectionSchema } from './schemas/collection.schema';
import { Project, ProjectSchema } from './schemas/project.schema';

@Injectable()
export class ConfigurationService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    private readonly configService: ConfigService,
    private readonly cache: ConfigCacheService,
  ) {}

  async createProject(dto: CreateProjectDto) {
    const { projectModel } = this.models();
    try {
      return await projectModel.create(dto);
    } catch (error) {
      this.throwDuplicate(error, 'Project already exists');
      throw error;
    }
  }

  async listProjects() {
    return this.models().projectModel.find().lean().exec();
  }

  async getProject(projectId: string) {
    const project = await this.models().projectModel.findOne({ projectId }).lean().exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async updateProject(projectId: string, dto: UpdateProjectDto) {
    const project = await this.models().projectModel
      .findOneAndUpdate({ projectId }, dto, { new: true, runValidators: true })
      .lean()
      .exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    this.cache.invalidate(projectId);
    return project;
  }

  async deleteProject(projectId: string) {
    return this.updateProject(projectId, { isActive: false });
  }

  async createCollection(projectId: string, dto: CreateCollectionDto) {
    await this.ensureProject(projectId);
    const { collectionModel } = this.models();
    try {
      const collection = await collectionModel.create({ ...dto, projectId });
      this.cache.invalidate(projectId);
      return collection;
    } catch (error) {
      this.throwDuplicate(error, 'Collection already exists for project');
      throw error;
    }
  }

  async listCollections(projectId: string) {
    await this.ensureProject(projectId);
    return this.models().collectionModel.find({ projectId }).lean().exec();
  }

  async updateCollection(projectId: string, collectionId: string, dto: UpdateCollectionDto) {
    await this.ensureProject(projectId);
    try {
      const collection = await this.models().collectionModel
        .findOneAndUpdate({ _id: collectionId, projectId }, dto, {
          new: true,
          runValidators: true,
        })
        .lean()
        .exec();
      if (!collection) {
        throw new NotFoundException('Collection not found');
      }
      this.cache.invalidate(projectId);
      return collection;
    } catch (error) {
      this.throwDuplicate(error, 'Collection already exists for project');
      throw error;
    }
  }

  async deleteCollection(projectId: string, collectionId: string) {
    return this.updateCollection(projectId, collectionId, { isActive: false });
  }

  private async ensureProject(projectId: string) {
    const exists = await this.models().projectModel.exists({ projectId });
    if (!exists) {
      throw new NotFoundException('Project not found');
    }
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

  private throwDuplicate(error: unknown, message: string): void {
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      throw new ConflictException(message);
    }
  }
}