import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Area } from './schemas/area.schema';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { AreaResponse } from './interfaces/area-response.interface';

@Injectable()
export class AreaService {
  constructor(
    @InjectModel(Area.name) private areaModel: Model<Area>,
  ) {}

  /**
   * Create a new area with auto-generated path
   */
  async create(createAreaDto: CreateAreaDto): Promise<AreaResponse> {
    try {
      const { name, parentId } = createAreaDto; // - path removed

      // Validate unique name at same level
      await this.validateUniqueName(name, parentId);

      let level = 0;
      let parentObjectId: Types.ObjectId | null = null;
      let path = [name]; // - Auto-generate path for root

      // If parentId provided, validate parent exists
      if (parentId) {
        const parent = await this.findParent(parentId);
        level = parent.level + 1;
        parentObjectId = new Types.ObjectId(parentId);
        path = [...parent.path, name]; // - Auto-generate path from parent
      }

      // Create new area with auto-generated path
      const newArea = new this.areaModel({
        name,
        parentId: parentObjectId,
        level,
        path, // - Auto-generated path
      });

      const savedArea = await newArea.save();
      return this.formatAreaResponse(savedArea);
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Get all areas
   */
  async findAll(): Promise<AreaResponse[]> {
    const areas = await this.areaModel
      .find()
      .sort({ level: 1, name: 1 })
      .lean()
      .exec();
    
    return areas.map(area => this.formatAreaResponse(area));
  }

  /**
   * Get single area by ID
   */
  async findOne(id: string): Promise<AreaResponse> {
    const area = await this.areaModel.findById(id).lean().exec();
    if (!area) {
      throw new NotFoundException(`Area with ID "${id}" not found`);
    }
    return this.formatAreaResponse(area);
  }

  /**
   * Update area
   */
  async update(id: string, updateAreaDto: UpdateAreaDto): Promise<AreaResponse> {
    try {
      const area = await this.areaModel.findById(id);
      if (!area) {
        throw new NotFoundException(`Area with ID "${id}" not found`);
      }

      // Store old path for descendant updates
      const oldPath = [...area.path];

      // Handle parent change
      if (updateAreaDto.parentId && updateAreaDto.parentId !== area.parentId?.toString()) {
        const newParent = await this.findParent(updateAreaDto.parentId);
        
        // Check if new parent is not a descendant
        if (await this.isDescendant(area._id, newParent._id)) {
          throw new BadRequestException('Cannot move area to its own descendant');
        }

        area.parentId = new Types.ObjectId(updateAreaDto.parentId);
        area.level = newParent.level + 1;
        area.path = [...newParent.path, area.name];
        
        delete updateAreaDto.parentId;
      }

      // Handle name change
      if (updateAreaDto.name && updateAreaDto.name !== area.name) {
        await this.validateUniqueName(updateAreaDto.name, area.parentId?.toString());
        
        // Update path with new name
        const newPath = [...area.path.slice(0, -1), updateAreaDto.name];
        area.name = updateAreaDto.name;
        area.path = newPath;
        
        delete updateAreaDto.name;
      }

      // Apply other updates
      if (Object.keys(updateAreaDto).length > 0) {
        Object.assign(area, updateAreaDto);
      }

      area.updatedAt = new Date();
      await area.save();

      // Update all descendants if path changed
      if (oldPath.join(',') !== area.path.join(',')) {
        await this.updateDescendantPaths(area, oldPath);
        // Refresh area data
        const updatedArea = await this.areaModel.findById(id);
        return this.formatAreaResponse(updatedArea);
      }

      return this.formatAreaResponse(area);
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Delete area with cascade
   */
  async remove(id: string): Promise<{ deletedCount: number }> {
    const area = await this.areaModel.findById(id);
    if (!area) {
      throw new NotFoundException(`Area with ID "${id}" not found`);
    }

    // Get all descendants
    const descendants = await this.getDescendantIds(area._id);
    const allIds = [area._id, ...descendants];

    // Delete all
    const result = await this.areaModel.deleteMany({ _id: { $in: allIds } });
    
    return { deletedCount: result.deletedCount };
  }

  /**
   * Get hierarchical tree
   */
  async getTree(): Promise<AreaResponse[]> {
    const areas = await this.areaModel
      .find()
      .sort({ level: 1, name: 1 })
      .lean()
      .exec();
    
    return this.buildTree(areas);
  }

  /**
   * Get children of an area
   */
  async getChildren(id: string): Promise<AreaResponse[]> {
    await this.validateAreaExists(id);
    
    const children = await this.areaModel
      .find({ parentId: new Types.ObjectId(id) })
      .sort({ name: 1 })
      .lean()
      .exec();
    
    return children.map(child => this.formatAreaResponse(child));
  }

  /**
   * Get all descendants
   */
  async getDescendants(id: string): Promise<AreaResponse[]> {
    const area = await this.areaModel.findById(id);
    if (!area) {
      throw new NotFoundException(`Area with ID "${id}" not found`);
    }

    const descendants = await this.areaModel
      .find({
        'path': { $regex: `^${area.path.join(',')}` },
        _id: { $ne: area._id }
      })
      .sort({ level: 1, name: 1 })
      .lean()
      .exec();
    
    return descendants.map(desc => this.formatAreaResponse(desc));
  }

  // ============= PRIVATE HELPER METHODS =============

  /**
   * Find parent by ID
   */
  private async findParent(parentId: string): Promise<Area> {
    const parent = await this.areaModel.findById(parentId);
    if (!parent) {
      throw new NotFoundException(`Parent area with ID "${parentId}" not found`);
    }
    return parent;
  }

  /**
   * Validate area exists
   */
  private async validateAreaExists(id: string): Promise<void> {
    const exists = await this.areaModel.exists({ _id: id });
    if (!exists) {
      throw new NotFoundException(`Area with ID "${id}" not found`);
    }
  }

  /**
   * Validate unique name at same level
   */
  private async validateUniqueName(name: string, parentId?: string): Promise<void> {
    const query: any = { 
      name, 
      parentId: parentId ? new Types.ObjectId(parentId) : null 
    };
    
    const existing = await this.areaModel.findOne(query);
    if (existing) {
      throw new ConflictException(`Area with name "${name}" already exists at this level`);
    }
  }

  /**
   * Check if one area is descendant of another
   */
  private async isDescendant(ancestorId: Types.ObjectId, targetId: Types.ObjectId): Promise<boolean> {
    const target = await this.areaModel.findById(targetId);
    if (!target) return false;

    const ancestor = await this.areaModel.findById(ancestorId);
    if (!ancestor) return false;

    // Check if ancestor path is prefix of target path
    const ancestorPathStr = ancestor.path.join(',');
    const targetPathStr = target.path.join(',');
    
    return targetPathStr.startsWith(ancestorPathStr) && ancestorPathStr !== targetPathStr;
  }

  /**
   * Update descendant paths
   */
  private async updateDescendantPaths(area: Area, oldPath: string[]): Promise<void> {
    // Find all descendants using old path
    const descendants = await this.areaModel.find({
      'path': { $regex: `^${oldPath.join(',')}` },
      _id: { $ne: area._id }
    });

    for (const desc of descendants) {
      // Calculate remaining path after the old path
      const remainingPath = desc.path.slice(oldPath.length);
      // Build new path with new area path + remaining
      const newPath = [...area.path, ...remainingPath];
      
      desc.path = newPath;
      desc.level = area.level + remainingPath.length;
      await desc.save();
    }
  }

  /**
   * Get all descendant IDs
   */
  private async getDescendantIds(parentId: Types.ObjectId): Promise<Types.ObjectId[]> {
    const ids: Types.ObjectId[] = [];
    const children = await this.areaModel.find({ parentId });
    
    for (const child of children) {
      ids.push(child._id);
      const childDescendants = await this.getDescendantIds(child._id);
      ids.push(...childDescendants);
    }
    
    return ids;
  }

  /**
   * Build tree structure
   */
  private buildTree(areas: any[], parentId: string | null = null): AreaResponse[] {
    const result: AreaResponse[] = [];

    for (const area of areas) {
      const areaParentId = area.parentId ? area.parentId.toString() : null;
      
      if (areaParentId === parentId) {
        const children = this.buildTree(areas, area._id.toString());
        const response = this.formatAreaResponse(area);
        
        result.push({
          ...response,
          children: children.length > 0 ? children : [],
        });
      }
    }

    return result;
  }

  /**
   * Format area response
   */
  private formatAreaResponse(area: any): AreaResponse {
    return {
      id: area._id.toString(),
      name: area.name,
      parentId: area.parentId ? area.parentId.toString() : null,
      level: area.level,
      path: area.path,
      // createdAt: area.createdAt || new Date(),
      // updatedAt: area.updatedAt || new Date(),
    };
  }

  /**
   * Handle errors
   */
  private handleError(error: any): never {
    if (error instanceof NotFoundException || 
        error instanceof ConflictException ||
        error instanceof BadRequestException) {
      throw error;
    }
    throw new BadRequestException(error.message || 'An error occurred');
  }
}