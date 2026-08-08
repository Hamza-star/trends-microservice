import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { MenuService, type MenuTreeNode } from './menu.service';
import { CreateMenuDto } from './schema/dto/create-menu.dto';
import { UpdateMenuDto } from './schema/dto/update-menu.dto';
import { Menu } from './schema/menu.schema';
import { JwtAuthGuard } from '../auth/jwt.authguard';
import { PermissionGuard } from '../auth/roles.authguard';
import { RequirePermissions } from '../auth/permissions.decorator';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('menu.manage')
  @Post()
  createMenu(@Body() dto: CreateMenuDto): Promise<Menu> {
    return this.menuService.createMenu(dto);
  }
  
 @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('menu.read')
  @Get()
  getTree(): Promise<MenuTreeNode[]> {
    return this.menuService.getMenuTree();
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('menu.read')
  @Get(':id')
  getMenuById(@Param('id') id: string) {
    return this.menuService.getMenuById(id);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('menu.manage')
  @Put(':id')
  updateMenu(@Param('id') id: string, @Body() dto: UpdateMenuDto) {
    return this.menuService.updateMenu(id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('menu.manage')
  @Delete(':id')
  deleteMenu(@Param('id') id: string) {
    return this.menuService.deleteMenu(id);
  }
  
  
}
