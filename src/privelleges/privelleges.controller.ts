import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  NotFoundException,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PrivellegesService } from './privelleges.service';
import { Privelleges } from './schema/privelleges.schema';
import { AddPrivellegesDto } from './dto/privelleges.dto';
import { UpdatePrivellegesDto } from './dto/privelleges.dto';
import { JwtAuthGuard } from '../auth/jwt.authguard';
import { PermissionGuard } from '../auth/roles.authguard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { ALL_PERMISSIONS } from '../auth/permissions.constants';

@Controller('privelleges')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class PrivellegesController {
  constructor(private readonly privellegesService: PrivellegesService) {}

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('permissions.create')
  @Post('addprivelleges')
  async addPrivelleges(@Body() dto: AddPrivellegesDto): Promise<Privelleges> {
    if (!dto.name) {
      throw new NotFoundException('Name is required');
    }
    return await this.privellegesService.createPrivelleges(dto.name);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('permissions.read')
  @Get('allprivelleges')
  async getAllPrivelleges(): Promise<Privelleges[]> {
    return this.privellegesService.getAllPrivelleges();
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('permissions.read')
  @Get('allpermissions')
  async getAllPermissions(): Promise<string[]> {
    return ALL_PERMISSIONS;
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('permissions.update')
  @Put('updateprivelleges/:id')
  async updatePrivelleges(
    @Param('id') id: string,
    @Body() dto: UpdatePrivellegesDto,
  ): Promise<{ message: string }> {
    const { name } = dto;

    if (!name) {
      throw new NotFoundException('Name is required');
    }

    return await this.privellegesService.getPrivellegesByIdAndUpdate(id, name);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('permissions.delete')
  @Delete('deleteprivelleges/:id')
  async deletePrivelleges(
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return await this.privellegesService.getPrivellegesByIdAndDelete(id);
  }
}
