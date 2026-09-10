import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ProjectModelsService } from '../configuration/project-models.service';
import { CreateMeterDto } from './dto/create-meter.dto';
import { UpdateMeterDto } from './dto/update-meter.dto';
import { MeterResponse } from './interfaces/meter-response.interface';

@Injectable()
export class MeterService {
  constructor(private readonly projectModels: ProjectModelsService) {}

  async create(dto: CreateMeterDto): Promise<MeterResponse> {
    const { meterModel, areaModel } = await this.projectModels.getDefaultModels();
    try {
      if (!dto.key) throw new BadRequestException('key is required');
      if (dto.status !== false) {
        if (!dto.meterName) throw new BadRequestException('meterName is required when status is true');
        if (!dto.uniqueKey) throw new BadRequestException('uniqueKey is required when status is true');
        if (!dto.area) throw new BadRequestException('area is required when status is true');
        await this.validateUniqueKey(meterModel, dto.uniqueKey);
        await this.validateAreaExists(areaModel, dto.area);
      }
      const meter = await meterModel.create({ ...dto, area: dto.area ? new Types.ObjectId(dto.area) : null, status: dto.status ?? true });
      return this.format(meter);
    } catch (error) {
      this.handleError(error);
    }
  }

  async findAll(projectId: string, filters?: { area?: string; status?: boolean; search?: string }): Promise<MeterResponse[]> {
    const { meterModel } = await this.projectModels.getModels(projectId);
    const query: any = {};
    if (filters?.area) query.area = new Types.ObjectId(filters.area);
    if (filters?.status !== undefined) query.status = filters.status;
    if (filters?.search) query.$or = [
      { meterName: { $regex: filters.search, $options: 'i' } },
      { uniqueKey: { $regex: filters.search, $options: 'i' } },
      { infoText: { $regex: filters.search, $options: 'i' } },
    ];
    const meters = await meterModel.find(query).populate('area', 'name path level').sort({ meterName: 1 }).lean().exec();
    return meters.map((meter) => this.format(meter));
  }

  async findActive(projectId: string): Promise<MeterResponse[]> {
    return this.findAll(projectId, { status: true });
  }

  async findByKeys(projectId: string, keys: string[]): Promise<MeterResponse[]> {
    if (!keys?.length) return [];
    const { meterModel } = await this.projectModels.getModels(projectId);
    const meters = await meterModel.find({ key: { $in: keys } }).populate('area', 'name path level').sort({ meterName: 1 }).lean().exec();
    return meters.map((meter) => this.format(meter));
  }

  async findOne(projectId: string, id: string): Promise<MeterResponse> {
    const { meterModel } = await this.projectModels.getModels(projectId);
    const meter = await meterModel.findOne({ _id: id }).populate('area', 'name path level').lean().exec();
    if (!meter) throw new NotFoundException(`Meter with ID "${id}" not found`);
    return this.format(meter);
  }

  async findByUniqueKey(projectId: string, uniqueKey: string): Promise<MeterResponse> {
    const { meterModel } = await this.projectModels.getModels(projectId);
    const meter = await meterModel.findOne({ uniqueKey }).populate('area', 'name path level').lean().exec();
    if (!meter) throw new NotFoundException(`Meter with uniqueKey "${uniqueKey}" not found`);
    return this.format(meter);
  }

  async findByArea(projectId: string, areaId: string): Promise<MeterResponse[]> {
    const { meterModel, areaModel } = await this.projectModels.getModels(projectId);
    await this.validateAreaExists(areaModel, areaId);
    const meters = await meterModel.find({ area: new Types.ObjectId(areaId) }).populate('area', 'name path level').sort({ meterName: 1 }).lean().exec();
    return meters.map((meter) => this.format(meter));
  }

  async update(id: string, dto: UpdateMeterDto): Promise<MeterResponse> {
    const { meterModel, areaModel } = await this.projectModels.getDefaultModels();
    try {
      const meter = await meterModel.findOne({ _id: id });
      if (!meter) throw new NotFoundException(`Meter with ID "${id}" not found`);
      const finalStatus = dto.status ?? meter.status;
      if (finalStatus && dto.area === '') throw new BadRequestException('area cannot be empty when status is true');
      if (dto.uniqueKey && dto.uniqueKey !== meter.uniqueKey) await this.validateUniqueKey(meterModel, dto.uniqueKey, id);
      if (dto.area) await this.validateAreaExists(areaModel, dto.area);
      Object.assign(meter, { ...dto, area: dto.area ? new Types.ObjectId(dto.area) : meter.area });
      await meter.save();
      return this.format(await meterModel.findOne({ _id: id }).populate('area', 'name path level').lean().exec());
    } catch (error) {
      this.handleError(error);
    }
  }

  async toggleStatus(id: string): Promise<MeterResponse> {
    const { meterModel } = await this.projectModels.getDefaultModels();
    const meter = await meterModel.findOne({ _id: id });
    if (!meter) throw new NotFoundException(`Meter with ID "${id}" not found`);
    meter.status = !meter.status;
    await meter.save();
    return this.format(await meterModel.findOne({ _id: id }).populate('area', 'name path level').lean().exec());
  }

  async remove(id: string): Promise<{ deletedCount: number }> {
    const { meterModel } = await this.projectModels.getDefaultModels();
    const result = await meterModel.deleteOne({ _id: id });
    if (!result.deletedCount) throw new NotFoundException(`Meter with ID "${id}" not found`);
    return { deletedCount: result.deletedCount };
  }

  async getAllMeterNames(projectId: string): Promise<string[]> {
    const { meterModel } = await this.projectModels.getModels(projectId);
    const meters = await meterModel.find().select('meterName').sort({ meterName: 1 }).lean().exec();
    return meters.map((meter) => meter.meterName);
  }

  async getMetersWithAreaPath(projectId: string): Promise<any[]> {
    const { meterModel } = await this.projectModels.getModels(projectId);
    const meters = await meterModel.find().populate('area', 'name path level parentId').sort({ meterName: 1 }).lean().exec();
    return meters.map((meter) => {
      const area = meter.area as any;
      return { ...this.format(meter), areaPath: area?.path || [], areaLevel: area?.level || 0 };
    });
  }

  async getMetersByAreaHierarchy(projectId: string, areaId: string): Promise<MeterResponse[]> {
    const { meterModel, areaModel } = await this.projectModels.getModels(projectId);
    const area = await areaModel.findOne({ _id: areaId });
    if (!area) throw new NotFoundException(`Area with ID "${areaId}" not found`);
    const subAreas = await areaModel.find({ path: { $regex: `^${area.path.join(',')}` } });
    const meters = await meterModel.find({ area: { $in: [area._id, ...subAreas.map((item) => item._id)] } }).populate('area', 'name path level').sort({ meterName: 1 }).lean().exec();
    return meters.map((meter) => this.format(meter));
  }

  private async validateUniqueKey(model: any, uniqueKey: string, excludeId?: string): Promise<void> {
    const query: any = { uniqueKey };
    if (excludeId) query._id = { $ne: new Types.ObjectId(excludeId) };
    if (await model.findOne(query)) throw new ConflictException(`Meter with uniqueKey "${uniqueKey}" already exists`);
  }

  private async validateAreaExists(model: any, id: string): Promise<void> {
    if (!(await model.exists({ _id: id }))) throw new NotFoundException(`Area with ID "${id}" not found`);
  }

  private format(meter: any): MeterResponse {
    return {
      id: meter._id.toString(), meterName: meter.meterName, uniqueKey: meter.uniqueKey || '',
      area: meter.area?._id?.toString() || meter.area?.toString() || meter.area, infoText: meter.infoText || '',
      status: meter.status, key: meter.key, createdAt: meter.createdAt || new Date(), updatedAt: meter.updatedAt || new Date(),
      areaDetails: meter.area ? { id: meter.area._id.toString(), name: meter.area.name, path: meter.area.path, level: meter.area.level } : undefined,
    };
  }

  private handleError(error: any): never {
    if (error instanceof NotFoundException || error instanceof ConflictException || error instanceof BadRequestException) throw error;
    throw new BadRequestException(error.message || 'An error occurred');
  }


  async getParamOptions(projectId: string, category?: string) {
    // Get single document
    const database = await this.projectModels.getProjectDatabase(projectId);
    const doc = await database.collection('params')
      .findOne({});

    if (!doc) {
      return [];
    }

    const allOptions = doc.paramOptions || [];

    // If category provided, filter
    if (category) {
      const filtered = allOptions.find(item => item.category === category);
      return filtered?.options || [];
    }

    // Return all categories with options
    return allOptions;
  }



  async getParam(projectId: string) {
  try {
    // Bas pehla document fetch karo
    const database = await this.projectModels.getProjectDatabase(projectId);
    const doc = await database.collection('unique-keys')
      .findOne({});

    if (!doc) {
      return { message: 'No document found', data: {} };
    }

    // _id hatado aur baaki saara data return karo
    const { _id, ...data } = doc;
    
    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      success: false,
      error: error.message,
      data: {}
    };
  }
}
}
