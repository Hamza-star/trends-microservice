import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { ProjectConfigService } from './project-config.service';
import { Area, AreaSchema } from '../areas/schemas/area.schema';
import { Meter, MeterSchema } from '../meter/schemas/meter.schema';

@Injectable()
export class ProjectModelsService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly projectConfigService: ProjectConfigService,
  ) {}

  async getModels(projectId: string): Promise<{ meterModel: Model<Meter>; areaModel: Model<Area> }> {
    const database = await this.projectConfigService.getProjectDatabase(projectId);
    return this.modelsForDatabase(database);
  }

  async getDefaultModels(): Promise<{ meterModel: Model<Meter>; areaModel: Model<Area> }> {
    return this.modelsForDatabase(this.connection);
  }

  async getProjectDatabase(projectId: string) {
    return this.projectConfigService.getProjectDatabase(projectId);
  }

  private modelsForDatabase(database: Connection): { meterModel: Model<Meter>; areaModel: Model<Area> } {
    const meterModel = database.models[Meter.name]
      ? database.models[Meter.name] as Model<Meter>
      : database.model(Meter.name, MeterSchema);
    const areaModel = database.models[Area.name]
      ? database.models[Area.name] as Model<Area>
      : database.model(Area.name, AreaSchema);

    return { meterModel, areaModel };
  }
}