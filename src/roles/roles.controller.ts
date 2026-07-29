/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
  Patch,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from 'src/auth/jwt.authguard';
import { AdminGuard } from 'src/auth/roles.authguard';
import { AddRolesDto, UpdateRolesDto } from './dto/roles.dto';

@Controller('roles')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @UseGuards(JwtAuthGuard)
  @Post('addrole')
  async createRole(@Body() payload: AddRolesDto) {
    const name = payload.name;
    const menuIds = payload.menuIds ?? [];

    if (!name) {
      throw new BadRequestException('name is required');
    }

    try {
      const role = await this.rolesService.createRoleWithMenus(name, menuIds);
      return {
        message: 'Role created successfully',
        data: role,
      };
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === 11000) {
        // MongoDB duplicate key error
        throw new BadRequestException(
          `Role with name '${name}' already exists`,
        );
      }
      throw error;
    }
  }

 

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put('updaterole/:id')
  async updateRole(@Param('id') id: string, @Body() payload: UpdateRolesDto) {
    const name = payload.name;
    const menuIds = payload.menuIds ? [...new Set(payload.menuIds)] : undefined;

    if (name !== undefined && !name) {
      throw new BadRequestException('name is required');
    }

    return await this.rolesService.updateRoleWithMenus(id, name ?? '', menuIds);
  }

 
  @Get('allrole')
  async getAllRoles(): Promise<any> {
    // Add :Promise<any> return type
    const roles = await this.rolesService.getAllRoles();
    return {
      message: 'All roles retrieved successfully',
      data: roles,
    };
  }



  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete('deleterole/:id')
  @HttpCode(HttpStatus.OK)
  async deleteRole(@Param('id') id: string) {
    return await this.rolesService.getRoleByIdAndDelete(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put(':roleId')
  async assignMenusToRole(
    @Param('roleId') roleId: string,
    @Body('menuIds') menuIds: string[],
  ) {
    const role = await this.rolesService.assignMenusToRole(roleId, menuIds);

    return {
      message: 'Menus assigned successfully',
      data: role,
    };
  }

  @Patch(':id/admin-status')
  // @UseGuards(AdminGuard) // Only existing admins can make others admin
  async toggleAdminStatus(
    @Param('id') id: string,
    @Body('isAdmin') isAdmin: boolean,
  ) {
    return this.rolesService.makeRoleAdmin(id, isAdmin);
  }
}
