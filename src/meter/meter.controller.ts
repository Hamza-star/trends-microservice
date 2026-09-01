import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { MeterService } from './meter.service';
import { CreateMeterDto } from './dto/create-meter.dto';
import { UpdateMeterDto } from './dto/update-meter.dto';
import { ApiResponse, MeterResponse } from './interfaces/meter-response.interface';

@ApiTags('Meters')
@Controller('meters')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class MeterController {
  constructor(private readonly meterService: MeterService) {}


   /**
   * Get all meter names only
   * GET /meters/names
   */
  @Get('names')
  async getAllMeterNames(): Promise<string[]> {
    return this.meterService.getAllMeterNames();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new meter',
    description: 'Create a new meter with area relationship'
  })
  @ApiCreatedResponse({
    description: 'Meter created successfully',
    type: ApiResponse,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Unique key already exists' })
  @ApiNotFoundResponse({ description: 'Area not found' })
  @ApiBody({ type: CreateMeterDto })
  async create(@Body() createMeterDto: CreateMeterDto): Promise<ApiResponse> {
    const data = await this.meterService.create(createMeterDto);
    return {
      success: true,
      message: 'Meter created successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }


   /**
   * Get all active meters (status: true only)
   * GET /meters/active
   */
  @Get('active')
  @ApiOperation({ summary: 'Get all active meters with status true' })
  async findActive(): Promise<ApiResponse> {
    const data = await this.meterService.findActive();
    return {
      success: true,
      message: 'Active meters retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }


  @Get()
  @ApiOperation({
    summary: 'Get all meters',
    description: 'Retrieve all meters with optional filters'
  })
  @ApiQuery({ name: 'area', required: false, description: 'Filter by area ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status', enum: ['true', 'false'] })
  @ApiQuery({ name: 'search', required: false, description: 'Search by meterName, uniqueKey, or infoText' })
  @ApiOkResponse({
    description: 'Meters retrieved successfully',
    type: ApiResponse,
  })
  async findAll(
    @Query('area') area?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ): Promise<ApiResponse> {
    const filters: any = {};
    if (area) filters.area = area;
    if (status !== undefined) filters.status = status === 'true';
    if (search) filters.search = search;

    const data = await this.meterService.findAll(filters);
    return {
      success: true,
      message: 'Meters retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }


  @Get('area/:areaId')
  @ApiOperation({
    summary: 'Get meters by area',
    description: 'Retrieve all meters belonging to a specific area'
  })
  @ApiParam({
    name: 'areaId',
    description: 'Area ID',
    example: '6a1d66106bccaa9d0cfad4f1'
  })
  @ApiOkResponse({
    description: 'Meters retrieved successfully',
    type: ApiResponse,
  })
  @ApiNotFoundResponse({ description: 'Area not found' })
  async findByArea(@Param('areaId') areaId: string): Promise<ApiResponse> {
    const data = await this.meterService.findByArea(areaId);
    return {
      success: true,
      message: 'Meters retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('area/:areaId/hierarchy')
  @ApiOperation({
    summary: 'Get meters by area hierarchy',
    description: 'Retrieve meters from area and all sub-areas'
  })
  @ApiParam({
    name: 'areaId',
    description: 'Area ID',
    example: '6a1d66106bccaa9d0cfad4f1'
  })
  @ApiOkResponse({
    description: 'Meters retrieved successfully',
    type: ApiResponse,
  })
  @ApiNotFoundResponse({ description: 'Area not found' })
  async getMetersByAreaHierarchy(@Param('areaId') areaId: string): Promise<ApiResponse> {
    const data = await this.meterService.getMetersByAreaHierarchy(areaId);
    return {
      success: true,
      message: 'Meters retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('with-area-path')
  @ApiOperation({
    summary: 'Get meters with area path',
    description: 'Retrieve all meters with full area path information'
  })
  @ApiOkResponse({
    description: 'Meters retrieved successfully',
    type: ApiResponse,
  })
  async getMetersWithAreaPath(): Promise<ApiResponse> {
    const data = await this.meterService.getMetersWithAreaPath();
    return {
      success: true,
      message: 'Meters retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('unique/:uniqueKey')
  @ApiOperation({
    summary: 'Get meter by unique key',
    description: 'Retrieve a meter using its unique key'
  })
  @ApiParam({
    name: 'uniqueKey',
    description: 'Unique key of the meter',
    example: 'PG_PC_Z1_GW0_PLC1_EM01'
  })
  @ApiOkResponse({
    description: 'Meter retrieved successfully',
    type: ApiResponse,
  })
  @ApiNotFoundResponse({ description: 'Meter not found' })
  async findByUniqueKey(@Param('uniqueKey') uniqueKey: string): Promise<ApiResponse> {
    const data = await this.meterService.findByUniqueKey(uniqueKey);
    return {
      success: true,
      message: 'Meter retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get meter by ID',
    description: 'Retrieve a single meter by its ID'
  })
  @ApiParam({
    name: 'id',
    description: 'Meter ID',
    example: '6948dcb7cdb8889985c31a19'
  })
  @ApiOkResponse({
    description: 'Meter retrieved successfully',
    type: ApiResponse,
  })
  @ApiNotFoundResponse({ description: 'Meter not found' })
  async findOne(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.meterService.findOne(id);
    return {
      success: true,
      message: 'Meter retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a meter',
    description: 'Update meter details'
  })
  @ApiParam({
    name: 'id',
    description: 'Meter ID',
    example: '6948dcb7cdb8889985c31a19'
  })
  @ApiOkResponse({
    description: 'Meter updated successfully',
    type: ApiResponse,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiNotFoundResponse({ description: 'Meter not found' })
  @ApiConflictResponse({ description: 'Unique key already exists' })
  @ApiBody({ type: UpdateMeterDto })
  async update(
    @Param('id') id: string,
    @Body() updateMeterDto: UpdateMeterDto,
  ): Promise<ApiResponse> {
    const data = await this.meterService.update(id, updateMeterDto);
    return {
      success: true,
      message: 'Meter updated successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Put(':id/toggle-status')
  @ApiOperation({
    summary: 'Toggle meter status',
    description: 'Toggle the status of a meter between active/inactive'
  })
  @ApiParam({
    name: 'id',
    description: 'Meter ID',
    example: '6948dcb7cdb8889985c31a19'
  })
  @ApiOkResponse({
    description: 'Meter status toggled successfully',
    type: ApiResponse,
  })
  @ApiNotFoundResponse({ description: 'Meter not found' })
  async toggleStatus(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.meterService.toggleStatus(id);
    return {
      success: true,
      message: `Meter status toggled to ${data.status ? 'active' : 'inactive'}`,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a meter',
    description: 'Delete a meter by its ID'
  })
  @ApiParam({
    name: 'id',
    description: 'Meter ID to delete',
    example: '6948dcb7cdb8889985c31a19'
  })
  @ApiOkResponse({
    description: 'Meter deleted successfully',
    type: ApiResponse,
  })
  @ApiNotFoundResponse({ description: 'Meter not found' })
  async remove(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.meterService.remove(id);
    return {
      success: true,
      message: 'Meter deleted successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }

 
}