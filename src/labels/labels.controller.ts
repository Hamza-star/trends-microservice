import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LabelsService } from './labels.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';

@Controller('labels')
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  // Create single label
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createLabelDto: CreateLabelDto) {
    return await this.labelsService.create(createLabelDto);
  }

  // Create multiple labels
  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  async createMany(@Body() createLabelDtos: CreateLabelDto[]) {
    return await this.labelsService.createMany(createLabelDtos);
  }

  // Get all labels
  @Get()
  async findAll() {
    return await this.labelsService.findAll();
  }

  // Get label by key
  @Get('key/:key')
  async findByKey(@Param('key') key: string) {
    return await this.labelsService.findByKey(key);
  }

  // Get label by id
  @Get('id/:id')
  async findById(@Param('id') id: string) {
    return await this.labelsService.findById(id);
  }

  // Get multiple labels by keys (query params: ?keys=key1,key2,key3)
  @Get('bulk/keys')
  async findByKeys(@Query('keys') keys: string) {
    const keysArray = keys ? keys.split(',') : [];
    return await this.labelsService.findByKeys(keysArray);
  }

  // Get multiple labels by ids (query params: ?ids=id1,id2,id3)
  @Get('bulk/ids')
  async findByIds(@Query('ids') ids: string) {
    const idsArray = ids ? ids.split(',') : [];
    return await this.labelsService.findByIds(idsArray);
  }

  // Update label by key
  @Put('key/:key')
  async updateByKey(
    @Param('key') key: string,
    @Body() updateLabelDto: UpdateLabelDto,
  ) {
    return await this.labelsService.updateByKey(key, updateLabelDto);
  }

  // Update label by id
  @Put('id/:id')
  async updateById(
    @Param('id') id: string,
    @Body() updateLabelDto: UpdateLabelDto,
  ) {
    return await this.labelsService.updateById(id, updateLabelDto);
  }

  // Delete label by key
  @Delete('key/:key')
  async deleteByKey(@Param('key') key: string) {
    return await this.labelsService.deleteByKey(key);
  }

  // Delete label by id
  @Delete('id/:id')
  async deleteById(@Param('id') id: string) {
    return await this.labelsService.deleteById(id);
  }

  // Delete multiple labels by keys
  @Delete('bulk/keys')
  @HttpCode(HttpStatus.OK)
  async deleteManyByKeys(@Body('keys') keys: string[]) {
    return await this.labelsService.deleteManyByKeys(keys);
  }

  // Delete multiple labels by ids
  @Delete('bulk/ids')
  @HttpCode(HttpStatus.OK)
  async deleteManyByIds(@Body('ids') ids: string[]) {
    return await this.labelsService.deleteManyByIds(ids);
  }
}
