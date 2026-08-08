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
  UsePipes,
  ValidationPipe,
  Req,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { AddRolesDto, UpdateRolesDto } from './dto/roles.dto';
import { JwtAuthGuard } from '../auth/jwt.authguard';
import { PermissionGuard } from '../auth/roles.authguard';
import { RequirePermissions } from '../auth/permissions.decorator';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user?: {
    userId?: string;
    role?: string;
  };
}

@Controller('roles')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('roles.manage')
  @Post('addrole')
  async createRole(@Body() payload: AddRolesDto, @Req() req: AuthenticatedRequest) {
    const name = payload.name;
    const permissions = payload.permissions ?? [];
    const menuIds = payload.menuIds ?? [];

    if (!name) {
      throw new BadRequestException('name is required');
    }

    try {
      const role = await this.rolesService.createRoleWithPermissions(
        name,
        permissions,
        req.user,
        menuIds,
      );
      return {
        message: 'Role created successfully',
        data: role,
      };
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === 11000) {
        throw new BadRequestException(`Role with name '${name}' already exists`);
      }
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('roles.manage')
  @Put('updaterole/:id')
  async updateRole(@Param('id') id: string, @Body() payload: UpdateRolesDto, @Req() req: AuthenticatedRequest) {
    if (payload.name !== undefined && !payload.name) {
      throw new BadRequestException('name is required');
    }

    return await this.rolesService.updateRoleWithPermissions(
      id,
      payload.name,
      payload.permissions,
      req.user,
      payload.menuIds,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('roles.read')
  @Get('allrole')
  async getAllRoles(@Req() req: AuthenticatedRequest): Promise<any> {
    const roles = await this.rolesService.getAllRoles(req.user);
    return {
      message: 'All roles retrieved successfully',
      data: roles,
    };
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('roles.manage')
  @Delete('deleterole/:id')
  @HttpCode(HttpStatus.OK)
  async deleteRole(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return await this.rolesService.getRoleByIdAndDelete(id, req.user);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('roles.manage')
  @Put(':roleId')
  async assignPermissionsToRole(
    @Param('roleId') roleId: string,
    @Body('permissions') permissions: string[],
    @Req() req: AuthenticatedRequest,
  ) {
    const role = await this.rolesService.assignPermissionsToRole(roleId, permissions, req.user);

    return {
      message: 'Permissions assigned successfully',
      data: role,
    };
  }
}

