import { Body, Controller, HttpCode, HttpStatus, Param, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { CreateMeterDto } from './dto/create-meter.dto';
import { UpdateMeterDto } from './dto/update-meter.dto';
import { ApiResponse } from './interfaces/meter-response.interface';
import { MeterService } from './meter.service';

interface ProjectRequest { projectId: string; }
interface KeysRequest extends ProjectRequest { keys: string[]; }

@Controller('meters')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class MeterController {
  constructor(private readonly meterService: MeterService) {}

  @Post('names')
  async getAllMeterNames(@Body() body: ProjectRequest): Promise<string[]> {
    return this.meterService.getAllMeterNames(body.projectId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateMeterDto): Promise<ApiResponse> {
    return { success: true, message: 'Meter created successfully', data: await this.meterService.create(dto), timestamp: new Date().toISOString() };
  }

  @Post('active')
  async findActive(@Body() body: ProjectRequest): Promise<ApiResponse> {
    return { success: true, message: 'Active meters retrieved successfully', data: await this.meterService.findActive(body.projectId), timestamp: new Date().toISOString() };
  }

  @Post('get-by-keys')
  async getMetersByKeys(@Body() body: KeysRequest): Promise<ApiResponse> {
    return { success: true, message: 'Meters retrieved successfully by keys', data: await this.meterService.findByKeys(body.projectId, body.keys), timestamp: new Date().toISOString() };
  }

  @Post('list')
  async findAll(@Body() body: ProjectRequest & { area?: string; status?: string; search?: string }): Promise<ApiResponse> {
    const filters: any = {};
    if (body.area) filters.area = body.area;
    if (body.status !== undefined) filters.status = body.status === 'true';
    if (body.search) filters.search = body.search;
    return { success: true, message: 'Meters retrieved successfully', data: await this.meterService.findAll(body.projectId, filters), timestamp: new Date().toISOString() };
  }

  @Post('area/:areaId')
  async findByArea(@Param('areaId') areaId: string, @Body() body: ProjectRequest): Promise<ApiResponse> {
    return { success: true, message: 'Meters retrieved successfully', data: await this.meterService.findByArea(body.projectId, areaId), timestamp: new Date().toISOString() };
  }

  @Post('area/:areaId/hierarchy')
  async getMetersByAreaHierarchy(@Param('areaId') areaId: string, @Body() body: ProjectRequest): Promise<ApiResponse> {
    return { success: true, message: 'Meters retrieved successfully', data: await this.meterService.getMetersByAreaHierarchy(body.projectId, areaId), timestamp: new Date().toISOString() };
  }

  @Post('with-area-path')
  async getMetersWithAreaPath(@Body() body: ProjectRequest): Promise<ApiResponse> {
    return { success: true, message: 'Meters retrieved successfully', data: await this.meterService.getMetersWithAreaPath(body.projectId), timestamp: new Date().toISOString() };
  }

  @Post('unique/:uniqueKey')
  async findByUniqueKey(@Param('uniqueKey') uniqueKey: string, @Body() body: ProjectRequest): Promise<ApiResponse> {
    return { success: true, message: 'Meter retrieved successfully', data: await this.meterService.findByUniqueKey(body.projectId, uniqueKey), timestamp: new Date().toISOString() };
  }

  @Post('param-options')
  async getParamOptions(@Body() body: ProjectRequest & { category?: string }) {
    return this.meterService.getParamOptions(body.projectId, body.category);
  }

  @Post('unique-keys')
  async getParam(@Body() body: ProjectRequest) {
    return this.meterService.getParam(body.projectId);
  }

  @Post(':id')
  async findOne(@Param('id') id: string, @Body() body: ProjectRequest): Promise<ApiResponse> {
    return { success: true, message: 'Meter retrieved successfully', data: await this.meterService.findOne(body.projectId, id), timestamp: new Date().toISOString() };
  }

  @Post(':id/update')
  async update(@Param('id') id: string, @Body() dto: UpdateMeterDto): Promise<ApiResponse> {
    return { success: true, message: 'Meter updated successfully', data: await this.meterService.update(id, dto), timestamp: new Date().toISOString() };
  }

  @Post(':id/toggle-status')
  async toggleStatus(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.meterService.toggleStatus(id);
    return { success: true, message: `Meter status toggled to ${data.status ? 'active' : 'inactive'}`, data, timestamp: new Date().toISOString() };
  }

  @Post(':id/delete')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<ApiResponse> {
    return { success: true, message: 'Meter deleted successfully', data: await this.meterService.remove(id), timestamp: new Date().toISOString() };
  }

}
