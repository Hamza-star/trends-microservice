import { Body, Controller, HttpCode, HttpStatus, Param, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { ApiResponse } from './interfaces/area-response.interface';
import { AreaService } from './areas.service';

interface ProjectRequest {
  projectId: string;
}

@Controller('areas')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class AreaController {
  constructor(private readonly areaService: AreaService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateAreaDto): Promise<ApiResponse> {
    return { success: true, message: 'Area created successfully', data: await this.areaService.create(dto) };
  }

  @Post('list')
  async findAll(@Body() body: ProjectRequest): Promise<ApiResponse> {
    return { success: true, message: 'Areas retrieved successfully', data: await this.areaService.findAll(body.projectId) };
  }

  @Post('tree')
  async getTree(@Body() body: ProjectRequest): Promise<ApiResponse> {
    return { success: true, message: 'Area tree retrieved successfully', data: await this.areaService.getTree(body.projectId) };
  }

  @Post(':id')
  async findOne(@Param('id') id: string, @Body() body: ProjectRequest): Promise<ApiResponse> {
    return { success: true, message: 'Area retrieved successfully', data: await this.areaService.findOne(body.projectId, id) };
  }

  @Post(':id/children')
  async getChildren(@Param('id') id: string, @Body() body: ProjectRequest): Promise<ApiResponse> {
    return { success: true, message: 'Children retrieved successfully', data: await this.areaService.getChildren(body.projectId, id) };
  }

  @Post(':id/descendants')
  async getDescendants(@Param('id') id: string, @Body() body: ProjectRequest): Promise<ApiResponse> {
    return { success: true, message: 'Descendants retrieved successfully', data: await this.areaService.getDescendants(body.projectId, id) };
  }

  @Post(':id/update')
  async update(@Param('id') id: string, @Body() dto: UpdateAreaDto): Promise<ApiResponse> {
    return { success: true, message: 'Area updated successfully', data: await this.areaService.update(id, dto) };
  }

  @Post(':id/delete')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<ApiResponse> {
    return { success: true, message: 'Area deleted successfully', data: await this.areaService.remove(id) };
  }
}
