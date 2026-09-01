// meter.service.ts
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Meter } from './schemas/meter.schema';
import { CreateMeterDto } from './dto/create-meter.dto';
import { UpdateMeterDto } from './dto/update-meter.dto';
import { MeterResponse } from './interfaces/meter-response.interface';
import { Area } from '../areas/schemas/area.schema';

@Injectable()
export class MeterService {
  constructor(
    @InjectModel(Meter.name) private meterModel: Model<Meter>,
    @InjectModel(Area.name) private areaModel: Model<Area>,
  ) {}

  /**
   * Create a new meter with conditional validation
   */
  async create(createMeterDto: CreateMeterDto): Promise<MeterResponse> {
    try {
      const { meterName, uniqueKey, area, infoText, status, key } = createMeterDto;

      // Validate key is always required
      if (!key) {
        throw new BadRequestException('key is required');
      }

      // Conditional validation based on status
      if (status === true || status === undefined) {
        // When status is true or not provided
        if (!meterName) {
          throw new BadRequestException('meterName is required when status is true');
        }
        if (!uniqueKey) {
          throw new BadRequestException('uniqueKey is required when status is true');
        }
        if (!area) {
          throw new BadRequestException('area is required when status is true');
        }
        
        // Validate uniqueKey uniqueness
        await this.validateUniqueKey(uniqueKey);
        // Validate area exists
        await this.validateAreaExists(area);
        
      } else if (status === false) {
        // When status is false
        if (!meterName) {
          throw new BadRequestException('meterName is required when status is false');
        }
        if (!key) {
          throw new BadRequestException('key is required when status is false');
        }
        // uniqueKey and area are NOT required when status is false
        // infoText is optional when status is false
      }

      // Create new meter
      const newMeter = new this.meterModel({
        meterName: meterName || '',
        uniqueKey: uniqueKey || '',
        area: area ? new Types.ObjectId(area) : null,
        infoText: infoText || '',
        status: status !== undefined ? status : true,
        key: key,
      });

      const savedMeter = await newMeter.save();
      return this.formatMeterResponse(savedMeter);
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Get all meters with optional filters
   */
  async findAll(filters?: { area?: string; status?: boolean; search?: string }): Promise<MeterResponse[]> {
    const query: any = {};

    if (filters?.area) {
      query.area = new Types.ObjectId(filters.area);
    }

    if (filters?.status !== undefined) {
      query.status = filters.status;
    }

    if (filters?.search) {
      query.$or = [
        { meterName: { $regex: filters.search, $options: 'i' } },
        { uniqueKey: { $regex: filters.search, $options: 'i' } },
        { infoText: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const meters = await this.meterModel
      .find(query)
      .populate('area', 'name path level')
      .sort({ meterName: 1 })
      .lean()
      .exec();

    return meters.map(meter => this.formatMeterResponse(meter));
  }

  /**
   * Get all active meters (status: true only)
   */
  async findActive(): Promise<MeterResponse[]> {
    const meters = await this.meterModel
      .find({ status: true })  // Sirf status true wale
      .populate('area', 'name path level')
      .sort({ meterName: 1 })
      .lean()
      .exec();

    return meters.map(meter => this.formatMeterResponse(meter));
  }


  /**
   * Get single meter by ID
   */
  async findOne(id: string): Promise<MeterResponse> {
    const meter = await this.meterModel
      .findById(id)
      .populate('area', 'name path level')
      .lean()
      .exec();

    if (!meter) {
      throw new NotFoundException(`Meter with ID "${id}" not found`);
    }

    return this.formatMeterResponse(meter);
  }

  /**
   * Get meter by uniqueKey
   */
  async findByUniqueKey(uniqueKey: string): Promise<MeterResponse> {
    const meter = await this.meterModel
      .findOne({ uniqueKey })
      .populate('area', 'name path level')
      .lean()
      .exec();

    if (!meter) {
      throw new NotFoundException(`Meter with uniqueKey "${uniqueKey}" not found`);
    }

    return this.formatMeterResponse(meter);
  }

  /**
   * Get meters by area
   */
  async findByArea(areaId: string): Promise<MeterResponse[]> {
    await this.validateAreaExists(areaId);

    const meters = await this.meterModel
      .find({ area: new Types.ObjectId(areaId) })
      .populate('area', 'name path level')
      .sort({ meterName: 1 })
      .lean()
      .exec();

    return meters.map(meter => this.formatMeterResponse(meter));
  }

  /**
   * Update meter with conditional validation
   */
  async update(id: string, updateMeterDto: UpdateMeterDto): Promise<MeterResponse> {
    try {
      const meter = await this.meterModel.findById(id);
      if (!meter) {
        throw new NotFoundException(`Meter with ID "${id}" not found`);
      }

      const { meterName, uniqueKey, area, infoText, status, key } = updateMeterDto;

      // Determine the final status (use existing if not provided)
      const finalStatus = status !== undefined ? status : meter.status;

      // Conditional validation based on final status
      if (finalStatus === true) {
        // When status is true
        if (meterName !== undefined && !meterName) {
          throw new BadRequestException('meterName cannot be empty when status is true');
        }
        if (uniqueKey !== undefined && !uniqueKey) {
          throw new BadRequestException('uniqueKey cannot be empty when status is true');
        }
        if (area !== undefined && !area) {
          throw new BadRequestException('area cannot be empty when status is true');
        }
        // key is optional in update when status is true
      } else if (finalStatus === false) {
        // When status is false
        if (meterName !== undefined && !meterName) {
          throw new BadRequestException('meterName cannot be empty when status is false');
        }
        if (key !== undefined && !key) {
          throw new BadRequestException('key cannot be empty when status is false');
        }
        // uniqueKey and area are NOT required when status is false
        // infoText is optional when status is false
      }

      // Validate uniqueKey if being updated and not empty
      if (updateMeterDto.uniqueKey && updateMeterDto.uniqueKey !== meter.uniqueKey) {
        await this.validateUniqueKey(updateMeterDto.uniqueKey, id);
      }

      // Validate area if being updated and not empty
      if (updateMeterDto.area && updateMeterDto.area !== meter.area?.toString()) {
        await this.validateAreaExists(updateMeterDto.area);
        updateMeterDto.area = new Types.ObjectId(updateMeterDto.area) as any;
      }

      // Apply updates (only update fields that are provided)
      if (meterName !== undefined) meter.meterName = meterName;
      if (uniqueKey !== undefined) meter.uniqueKey = uniqueKey;
      if (area !== undefined) meter.area = area ? new Types.ObjectId(area) : null;
      if (infoText !== undefined) meter.infoText = infoText;
      if (status !== undefined) meter.status = status;
      if (key !== undefined) meter.key = key;

      meter.updatedAt = new Date();
      await meter.save();

      // Get updated meter with populated area
      const updatedMeter = await this.meterModel
        .findById(id)
        .populate('area', 'name path level')
        .lean()
        .exec();

      return this.formatMeterResponse(updatedMeter);
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Delete meter
   */
  async remove(id: string): Promise<{ deletedCount: number }> {
    const meter = await this.meterModel.findById(id);
    if (!meter) {
      throw new NotFoundException(`Meter with ID "${id}" not found`);
    }

    const result = await this.meterModel.findByIdAndDelete(id);
    return { deletedCount: result ? 1 : 0 };
  }


   /**
   * Get all meter names only
   */
  async getAllMeterNames(): Promise<string[]> {
    const meters = await this.meterModel
      .find()
      .select('meterName') // Sirf meterName field select karein
      .sort({ meterName: 1 }) // Alphabetical order mein
      .lean()
      .exec();

    return meters.map(meter => meter.meterName);
  }

  /**
   * Toggle meter status
   */
  async toggleStatus(id: string): Promise<MeterResponse> {
    const meter = await this.meterModel.findById(id);
    if (!meter) {
      throw new NotFoundException(`Meter with ID "${id}" not found`);
    }

    meter.status = !meter.status;
    meter.updatedAt = new Date();
    await meter.save();

    const updatedMeter = await this.meterModel
      .findById(id)
      .populate('area', 'name path level')
      .lean()
      .exec();

    return this.formatMeterResponse(updatedMeter);
  }

  /**
   * Get meters by area with full path
   */
  async getMetersWithAreaPath(): Promise<any[]> {
    const meters = await this.meterModel
      .find()
      .populate('area', 'name path level parentId')
      .sort({ meterName: 1 })
      .lean()
      .exec();

    return meters.map(meter => {
      const area = meter.area as any;
      return {
        ...this.formatMeterResponse(meter),
        areaPath: area?.path || [],
        areaLevel: area?.level || 0,
      };
    });
  }

  /**
   * Get meters by area hierarchy (including sub-areas)
   */
  async getMetersByAreaHierarchy(areaId: string): Promise<MeterResponse[]> {
    await this.validateAreaExists(areaId);

    // Get the area and its descendants
    const area = await this.areaModel.findById(areaId);
    if (!area) {
      throw new NotFoundException(`Area with ID "${areaId}" not found`);
    }

    // Find all sub-areas
    const subAreas = await this.areaModel.find({
      'path': { $regex: `^${area.path.join(',')}` }
    });

    const areaIds = [area._id, ...subAreas.map(a => a._id)];

    const meters = await this.meterModel
      .find({ area: { $in: areaIds } })
      .populate('area', 'name path level')
      .sort({ meterName: 1 })
      .lean()
      .exec();

    return meters.map(meter => this.formatMeterResponse(meter));
  }

  // ============= PRIVATE HELPER METHODS =============

  /**
   * Validate uniqueKey uniqueness
   */
  private async validateUniqueKey(uniqueKey: string, excludeId?: string): Promise<void> {
    if (!uniqueKey) return; // Skip if empty
    
    const query: any = { uniqueKey };
    if (excludeId) {
      query._id = { $ne: new Types.ObjectId(excludeId) };
    }

    const existing = await this.meterModel.findOne(query);
    if (existing) {
      throw new ConflictException(`Meter with uniqueKey "${uniqueKey}" already exists`);
    }
  }

  /**
   * Validate area exists
   */
  private async validateAreaExists(areaId: string): Promise<void> {
    if (!areaId) return; // Skip if empty
    
    const exists = await this.areaModel.exists({ _id: areaId });
    if (!exists) {
      throw new NotFoundException(`Area with ID "${areaId}" not found`);
    }
  }

  /**
   * Format meter response
   */
  private formatMeterResponse(meter: any): MeterResponse {
    return {
      id: meter._id.toString(),
      meterName: meter.meterName,
      uniqueKey: meter.uniqueKey || '',
      area: meter.area?._id?.toString() || meter.area?.toString() || meter.area,
      infoText: meter.infoText || '',
      status: meter.status,
      key: meter.key,
      createdAt: meter.createdAt || new Date(),
      updatedAt: meter.updatedAt || new Date(),
      areaDetails: meter.area ? {
        id: meter.area._id.toString(),
        name: meter.area.name,
        path: meter.area.path,
        level: meter.area.level,
      } : undefined,
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