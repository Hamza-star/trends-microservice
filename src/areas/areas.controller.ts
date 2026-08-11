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
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { ApiResponse } from './interfaces/area-response.interface';
import { AreaService } from './areas.service';


@Controller('areas')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class AreaController {
  constructor(private readonly areaService: AreaService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
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