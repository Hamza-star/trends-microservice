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
import { AdminGuard } from '../auth/roles.authguard';
import { RequirePermissions } from '../auth/permissions.decorator';

@Controller('privelleges')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class PrivellegesController {
  constructor(private readonly privellegesService: PrivellegesService) {}

  @UseGuards(JwtAuthGuard, AdminGuard)
  @RequirePermissions('permissions.manage')
  @Post('addprivelleges')
  async addPrivelleges(@Body() dto: AddPrivellegesDto): Promise<Privelleges> {
    if (!dto.name) {
      throw new NotFoundException('Name is required');
    }
    return await this.privellegesService.createPrivelleges(dto.name);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @RequirePermissions('permissions.read')
  @Get('allprivelleges')
  async getAllPrivelleges(): Promise<Privelleges[]> {
    return this.privellegesService.getAllPrivelleges();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @RequirePermissions('permissions.read')
  @Get('allpermissions')
  async getAllPermissions(): Promise<string[]> {
    return [
      'roles.manage',
      'users.manage',
      'users.read',
      'menu.manage',
      'menu.read',
      'labels.manage',
      'labels.read',
      'permissions.manage',
      'permissions.read',
    ];
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @RequirePermissions('permissions.manage')
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

  @UseGuards(JwtAuthGuard, AdminGuard)
  @RequirePermissions('permissions.manage')
  @Delete('deleteprivelleges/:id')
  async deletePrivelleges(
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return await this.privellegesService.getPrivellegesByIdAndDelete(id);
  }
}
