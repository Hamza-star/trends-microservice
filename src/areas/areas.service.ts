import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ProjectModelsService } from '../configuration/project-models.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { Area } from './schemas/area.schema';
import { AreaResponse } from './interfaces/area-response.interface';

@Injectable()
export class AreaService {
  constructor(private readonly projectModels: ProjectModelsService) {}

  async create(dto: CreateAreaDto): Promise<AreaResponse> {
    const { areaModel } = await this.projectModels.getDefaultModels();
    try {
      await this.validateUniqueName(areaModel, dto.name, dto.parentId);
      let level = 0;
      let parentId: Types.ObjectId | null = null;
      let path = [dto.name];
      if (dto.parentId) {
        const parent = await this.findParent(areaModel, dto.parentId);
        level = parent.level + 1;
        parentId = new Types.ObjectId(dto.parentId);
        path = [...parent.path, dto.name];
      }
      const area = await areaModel.create({
        name: dto.name,
        parentId,
        level,
        path,
      });
      return this.format(area);
    } catch (error) {
      this.handleError(error);
    }
  }

  async findAll(projectId: string): Promise<AreaResponse[]> {
    const { areaModel } = await this.projectModels.getModels(projectId);
    const areas = await areaModel.find().sort({ level: 1, name: 1 }).lean().exec();
    return areas.map((area) => this.format(area));
  }

  async findOne(projectId: string, id: string): Promise<AreaResponse> {
    const { areaModel } = await this.projectModels.getModels(projectId);
    const area = await areaModel.findOne({ _id: id }).lean().exec();
    if (!area) throw new NotFoundException(`Area with ID "${id}" not found`);
    return this.format(area);
  }

  async update(id: string, dto: UpdateAreaDto): Promise<AreaResponse> {
    const { areaModel } = await this.projectModels.getDefaultModels();
    try {
      const area = await areaModel.findOne({ _id: id });
      if (!area) throw new NotFoundException(`Area with ID "${id}" not found`);
      const oldPath = [...area.path];

      if (dto.parentId && dto.parentId !== area.parentId?.toString()) {
        const parent = await this.findParent(areaModel, dto.parentId);
        if (await this.isDescendant(areaModel, area._id, parent._id)) {
          throw new BadRequestException('Cannot move area to its own descendant');
        }
        area.parentId = new Types.ObjectId(dto.parentId);
        area.level = parent.level + 1;
        area.path = [...parent.path, area.name];
      }
      if (dto.name && dto.name !== area.name) {
        await this.validateUniqueName(areaModel, dto.name, area.parentId?.toString(), id);
        area.name = dto.name;
        area.path = [...area.path.slice(0, -1), dto.name];
      }
      area.updatedAt = new Date();
      await area.save();
      if (oldPath.join(',') !== area.path.join(',')) {
        await this.updateDescendantPaths(areaModel, area, oldPath);
      }
      return this.format(await areaModel.findOne({ _id: id }).lean().exec());
    } catch (error) {
      this.handleError(error);
    }
  }

  async remove(id: string): Promise<{ deletedCount: number }> {
    const { areaModel } = await this.projectModels.getDefaultModels();
    const area = await areaModel.findOne({ _id: id });
    if (!area) throw new NotFoundException(`Area with ID "${id}" not found`);
    const descendants = await this.getDescendantIds(areaModel, area._id);
    const result = await areaModel.deleteMany({ _id: { $in: [area._id, ...descendants] } });
    return { deletedCount: result.deletedCount };
  }

  async getTree(projectId: string): Promise<AreaResponse[]> {
    const areas = await this.findAllRaw(projectId);
    return this.buildTree(areas);
  }

  async getChildren(projectId: string, id: string): Promise<AreaResponse[]> {
    const { areaModel } = await this.projectModels.getModels(projectId);
    await this.validateAreaExists(areaModel, id);
    const areas = await areaModel.find({ parentId: new Types.ObjectId(id) }).sort({ name: 1 }).lean().exec();
    return areas.map((area) => this.format(area));
  }

  async getDescendants(projectId: string, id: string): Promise<AreaResponse[]> {
    const { areaModel } = await this.projectModels.getModels(projectId);
    const area = await areaModel.findOne({ _id: id });
    if (!area) throw new NotFoundException(`Area with ID "${id}" not found`);
    const areas = await areaModel.find({ path: { $regex: `^${area.path.join(',')}` }, _id: { $ne: area._id } }).sort({ level: 1, name: 1 }).lean().exec();
    return areas.map((item) => this.format(item));
  }

  private async findAllRaw(projectId: string): Promise<any[]> {
    const { areaModel } = await this.projectModels.getModels(projectId);
    return areaModel.find().sort({ level: 1, name: 1 }).lean().exec();
  }

  private async findParent(model: any, id: string): Promise<Area> {
    const parent = await model.findById(id);
    if (!parent) throw new NotFoundException(`Parent area with ID "${id}" not found`);
    return parent;
  }

  private async validateAreaExists(model: any, id: string): Promise<void> {
    if (!(await model.exists({ _id: id }))) throw new NotFoundException(`Area with ID "${id}" not found`);
  }

  private async validateUniqueName(model: any, name: string, parentId?: string, excludeId?: string): Promise<void> {
    const query: any = { name, parentId: parentId ? new Types.ObjectId(parentId) : null };
    if (excludeId) query._id = { $ne: excludeId };
    if (await model.findOne(query)) throw new ConflictException(`Area with name "${name}" already exists at this level`);
  }

  private async isDescendant(model: any, ancestorId: Types.ObjectId, targetId: Types.ObjectId): Promise<boolean> {
    const [ancestor, target] = await Promise.all([model.findById(ancestorId), model.findById(targetId)]);
    if (!ancestor || !target) return false;
    return target.path.join(',').startsWith(ancestor.path.join(',')) && ancestor.path.join(',') !== target.path.join(',');
  }

  private async updateDescendantPaths(model: any, area: Area, oldPath: string[]): Promise<void> {
    const descendants = await model.find({ path: { $regex: `^${oldPath.join(',')}` }, _id: { $ne: area._id } });
    for (const descendant of descendants) {
      const remaining = descendant.path.slice(oldPath.length);
      descendant.path = [...area.path, ...remaining];
      descendant.level = area.level + remaining.length;
      await descendant.save();
    }
  }

  private async getDescendantIds(model: any, parentId: Types.ObjectId): Promise<Types.ObjectId[]> {
    const ids: Types.ObjectId[] = [];
    const children = await model.find({ parentId });
    for (const child of children) ids.push(child._id, ...(await this.getDescendantIds(model, child._id)));
    return ids;
  }

  private buildTree(areas: any[], parentId: string | null = null): AreaResponse[] {
    return areas.filter((area) => (area.parentId?.toString() ?? null) === parentId).map((area) => ({
      ...this.format(area),
      children: this.buildTree(areas, area._id.toString()),
    }));
  }

  private format(area: any): AreaResponse {
    return { id: area._id.toString(), name: area.name, parentId: area.parentId?.toString() ?? null, level: area.level, path: area.path };
  }

  private handleError(error: any): never {
    if (error instanceof NotFoundException || error instanceof ConflictException || error instanceof BadRequestException) throw error;
    throw new BadRequestException(error.message || 'An error occurred');
  }
}
