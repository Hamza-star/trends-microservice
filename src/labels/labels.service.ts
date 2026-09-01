import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Db, ObjectId } from 'mongodb';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';
import { Label } from './interfaces/label.interface';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class LabelsService {
  constructor(@InjectConnection() private readonly connection: Connection,) {}

  private get db(): Db {
  if (!this.connection.db) {
    throw new Error('Database connection not established');
  }
  return this.connection.db;
}
  
    private get labelsCollection() {
    return this.db.collection<Label>('labels');
  }

  // Create single label
  async create(createLabelDto: CreateLabelDto): Promise<Label> {
    // Check if key already exists
    const existingLabel = await this.labelsCollection.findOne({
      key: createLabelDto.key,
    });
    if (existingLabel) {
      throw new ConflictException(
        `Label with key '${createLabelDto.key}' already exists`,
      );
    }

    const label: Label = {
      name: createLabelDto.name,
      key: createLabelDto.key,
      _id: new ObjectId(),
    };

    await this.labelsCollection.insertOne(label);
    return label;
  }

  // Create multiple labels at once
  async createMany(createLabelDtos: CreateLabelDto[]): Promise<Label[]> {
    const errors: string[] = [];
    const labels: Label[] = [];

    for (const dto of createLabelDtos) {
      // Check if key already exists
      const existingLabel = await this.labelsCollection.findOne({
        key: dto.key,
      });
      if (existingLabel) {
        errors.push(`Key '${dto.key}' already exists`);
      } else {
        labels.push({
          name: dto.name,
          key: dto.key,
          _id: new ObjectId(),
        });
      }
    }

    if (errors.length > 0) {
      throw new ConflictException(
        `Failed to create labels: ${errors.join(', ')}`,
      );
    }

    if (labels.length > 0) {
      await this.labelsCollection.insertMany(labels);
    }

    return labels;
  }

  async getLabelMap(): Promise<Map<string, string>> {
    const labels = await this.labelsCollection.find({}).toArray();
    const labelMap = new Map<string, string>();

    labels.forEach((label) => {
      labelMap.set(label.key, label.name);
    });

    return labelMap;
  }

  // Get all labels
  async findAll(): Promise<Label[]> {
    return await this.labelsCollection.find().sort({ name: 1 }).toArray();
  }

  // Get single label by key
  async findByKey(key: string): Promise<Label> {
    const label = await this.labelsCollection.findOne({ key });
    if (!label) {
      throw new NotFoundException(`Label with key '${key}' not found`);
    }
    return label;
  }

  // Get single label by id
  async findById(id: string): Promise<Label> {
    if (!ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid label ID');
    }

    const label = await this.labelsCollection.findOne({
      _id: new ObjectId(id),
    });
    if (!label) {
      throw new NotFoundException(`Label with id '${id}' not found`);
    }
    return label;
  }

  // Get multiple labels by keys
  async findByKeys(keys: string[]): Promise<Label[]> {
    if (!keys || keys.length === 0) return [];

    return await this.labelsCollection.find({ key: { $in: keys } }).toArray();
  }

  // Get multiple labels by ids
  async findByIds(ids: string[]): Promise<Label[]> {
    if (!ids || ids.length === 0) return [];

    const objectIds = ids
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));
    if (objectIds.length === 0) return [];

    return await this.labelsCollection
      .find({ _id: { $in: objectIds } })
      .toArray();
  }

  // Update label by key
  async updateByKey(
    key: string,
    updateLabelDto: UpdateLabelDto,
  ): Promise<Label> {
    const existingLabel = await this.labelsCollection.findOne({ key });
    if (!existingLabel) {
      throw new NotFoundException(`Label with key '${key}' not found`);
    }

    // If updating key, check if new key already exists
    if (updateLabelDto.key && updateLabelDto.key !== key) {
      const keyExists = await this.labelsCollection.findOne({
        key: updateLabelDto.key,
      });
      if (keyExists) {
        throw new ConflictException(
          `Label with key '${updateLabelDto.key}' already exists`,
        );
      }
    }

    // Update the document
    await this.labelsCollection.updateOne({ key }, { $set: updateLabelDto });

    // Fetch the updated document
    const updatedLabel = await this.labelsCollection.findOne({
      key: updateLabelDto.key || key,
    });

    if (!updatedLabel) {
      throw new NotFoundException(
        `Label with key '${key}' not found after update`,
      );
    }

    return updatedLabel;
  }

  // Update label by id
  async updateById(id: string, updateLabelDto: UpdateLabelDto): Promise<Label> {
    if (!ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid label ID');
    }

    const existingLabel = await this.labelsCollection.findOne({
      _id: new ObjectId(id),
    });
    if (!existingLabel) {
      throw new NotFoundException(`Label with id '${id}' not found`);
    }

    // If updating key, check if new key already exists
    if (updateLabelDto.key && updateLabelDto.key !== existingLabel.key) {
      const keyExists = await this.labelsCollection.findOne({
        key: updateLabelDto.key,
      });
      if (keyExists) {
        throw new ConflictException(
          `Label with key '${updateLabelDto.key}' already exists`,
        );
      }
    }

    // Update the document
    await this.labelsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateLabelDto },
    );

    // Fetch the updated document
    const updatedLabel = await this.labelsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!updatedLabel) {
      throw new NotFoundException(
        `Label with id '${id}' not found after update`,
      );
    }

    return updatedLabel;
  }

  // Delete label by key
  async deleteByKey(key: string): Promise<{ message: string }> {
    const result = await this.labelsCollection.deleteOne({ key });

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Label with key '${key}' not found`);
    }

    return { message: `Label '${key}' deleted successfully` };
  }

  // Delete label by id
  async deleteById(id: string): Promise<{ message: string }> {
    if (!ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid label ID');
    }

    const result = await this.labelsCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Label with id '${id}' not found`);
    }

    return { message: `Label deleted successfully` };
  }

  // Delete multiple labels by keys
  async deleteManyByKeys(
    keys: string[],
  ): Promise<{ deletedCount: number; message: string }> {
    const result = await this.labelsCollection.deleteMany({
      key: { $in: keys },
    });

    return {
      deletedCount: result.deletedCount,
      message: `${result.deletedCount} label(s) deleted successfully`,
    };
  }

  // Delete multiple labels by ids
  async deleteManyByIds(
    ids: string[],
  ): Promise<{ deletedCount: number; message: string }> {
    const objectIds = ids
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));

    if (objectIds.length === 0) {
      throw new BadRequestException('No valid IDs provided');
    }

    const result = await this.labelsCollection.deleteMany({
      _id: { $in: objectIds },
    });

    return {
      deletedCount: result.deletedCount,
      message: `${result.deletedCount} label(s) deleted successfully`,
    };
  }


  // labels.service.ts - In mein add karein

// Get labels by keys (POST method)
async getLabelsByKeys(keys: string[]): Promise<Label[]> {
  if (!keys || keys.length === 0) {
    return [];
  }

  const labels = await this.labelsCollection
    .find({ key: { $in: keys } })
    .toArray();

  return labels;
}

// Get labels by ids (POST method)
async getLabelsByIds(ids: string[]): Promise<Label[]> {
  if (!ids || ids.length === 0) {
    return [];
  }

  const objectIds = ids
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  if (objectIds.length === 0) {
    return [];
  }

  const labels = await this.labelsCollection
    .find({ _id: { $in: objectIds } })
    .toArray();

  return labels;
}
}
