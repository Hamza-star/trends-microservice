import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  HttpStatus,
  HttpCode,
  UsePipes,
  ValidationPipe
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse as SwaggerResponse, 
  ApiParam,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBadRequestResponse
} from '@nestjs/swagger';

import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { ApiResponse, AreaResponse } from './interfaces/area-response.interface';
import { AreaService } from './areas.service';

@ApiTags('Areas')
@Controller('areas')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class AreaController {
  constructor(private readonly areaService: AreaService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Create a new area',
    description: 'Create a new area with parent-child relationship. Provide path array manually.'
  })
  @ApiCreatedResponse({
    description: 'Area created successfully',
    type: ApiResponse,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Area name already exists at this level' })
  @ApiNotFoundResponse({ description: 'Parent area not found' })
  @ApiBody({ type: CreateAreaDto })
  async create(@Body() createAreaDto: CreateAreaDto): Promise<ApiResponse> {
    const data = await this.areaService.create(createAreaDto);
    return {
      success: true,
      message: 'Area created successfully',
      data,
      // timestamp: new Date().toISOString(),
    };
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all areas',
    description: 'Retrieve all areas with their details'
  })
  @ApiOkResponse({
    description: 'Areas retrieved successfully',
    type: ApiResponse,
  })
  async findAll(): Promise<ApiResponse> {
    const data = await this.areaService.findAll();
    return {
      success: true,
      message: 'Areas retrieved successfully',
      data,
      // timestamp: new Date().toISOString(),
    };
  }

  @Get('tree')
  @ApiOperation({ 
    summary: 'Get hierarchical tree',
    description: 'Retrieve all areas in a nested tree structure'
  })
  @ApiOkResponse({
    description: 'Area tree retrieved successfully',
    type: ApiResponse,
  })
  async getTree(): Promise<ApiResponse> {
    const data = await this.areaService.getTree();
    return {
      success: true,
      message: 'Area tree retrieved successfully',
      data,
      // timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get area by ID',
    description: 'Retrieve a single area by its ID'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Area ID',
    example: '6a1d66106bccaa9d0cfad4f1'
  })
  @ApiOkResponse({
    description: 'Area retrieved successfully',
    type: ApiResponse,
  })
  @ApiNotFoundResponse({ description: 'Area not found' })
  async findOne(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.areaService.findOne(id);
    return {
      success: true,
      message: 'Area retrieved successfully',
      data,
      // timestamp: new Date().toISOString(),
    };
  }

  @Get(':id/children')
  @ApiOperation({ 
    summary: 'Get children of an area',
    description: 'Retrieve all immediate children of a specific area'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Parent area ID',
    example: '6a1d66106bccaa9d0cfad4f1'
  })
  @ApiOkResponse({
    description: 'Children retrieved successfully',
    type: ApiResponse,
  })
  @ApiNotFoundResponse({ description: 'Area not found' })
  async getChildren(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.areaService.getChildren(id);
    return {
      success: true,
      message: 'Children retrieved successfully',
      data,
      // timestamp: new Date().toISOString(),
    };
  }

  @Get(':id/descendants')
  @ApiOperation({ 
    summary: 'Get all descendants',
    description: 'Retrieve all descendants (children, grandchildren, etc.) of a specific area'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Area ID',
    example: '6a1d66106bccaa9d0cfad4f1'
  })
  @ApiOkResponse({
    description: 'Descendants retrieved successfully',
    type: ApiResponse,
  })
  @ApiNotFoundResponse({ description: 'Area not found' })
  async getDescendants(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.areaService.getDescendants(id);
    return {
      success: true,
      message: 'Descendants retrieved successfully',
      data,
      // timestamp: new Date().toISOString(),
    };
  }

  @Put(':id')
  @ApiOperation({ 
    summary: 'Update an area',
    description: 'Update area details including name, parent, or path'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Area ID',
    example: '6a1d66106bccaa9d0cfad4f1'
  })
  @ApiOkResponse({
    description: 'Area updated successfully',
    type: ApiResponse,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiNotFoundResponse({ description: 'Area not found' })
  @ApiConflictResponse({ description: 'Area name already exists at this level' })
  @ApiBody({ type: UpdateAreaDto })
  async update(
    @Param('id') id: string,
    @Body() updateAreaDto: UpdateAreaDto
  ): Promise<ApiResponse> {
    const data = await this.areaService.update(id, updateAreaDto);
    return {
      success: true,
      message: 'Area updated successfully',
      data,
      // timestamp: new Date().toISOString(),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Delete an area',
    description: 'Delete an area and all its descendants (cascade delete)'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Area ID to delete',
    example: '6a1d66106bccaa9d0cfad4f1'
  })
  @ApiOkResponse({
    description: 'Area deleted successfully',
    type: ApiResponse,
  })
  @ApiNotFoundResponse({ description: 'Area not found' })
  async remove(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.areaService.remove(id);
    return {
      success: true,
      message: 'Area deleted successfully',
      data,
      // timestamp: new Date().toISOString(),
    };
  }
}