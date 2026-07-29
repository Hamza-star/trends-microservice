import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { MenuService } from './menu.service';
import { CreateMenuDto } from './schema/dto/create-menu.dto';
import { UpdateMenuDto } from './schema/dto/update-menu.dto';
import { Menu } from './schema/menu.schema';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  createMenu(@Body() dto: CreateMenuDto): Promise<Menu> {
    return this.menuService.createMenu(dto);
  }
  
//  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get()
  getTree() {
    return this.menuService.getMenuTree();
  }

  // @UseGuards(JwtAuthGuard, AdminGuard)
  @Get(':id')
  getMenuById(@Param('id') id: string) {
    return this.menuService.getMenuById(id);
  }

  // @UseGuards(JwtAuthGuard, AdminGuard)
  @Put(':id')
  updateMenu(@Param('id') id: string, @Body() dto: UpdateMenuDto) {
    return this.menuService.updateMenu(id, dto);
  }

  // @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  deleteMenu(@Param('id') id: string) {
    return this.menuService.deleteMenu(id);
  }
  
  
}
