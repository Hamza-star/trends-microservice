/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Controller,
  Get,
  Param,
  Patch,
  Delete,
  Body,
  Req,
  UseGuards,
  BadRequestException,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt.authguard';
import { PermissionGuard } from '../auth/roles.authguard';
import { RequirePermissions } from '../auth/permissions.decorator';
import type { Request } from 'express';
import { Users } from './schema/users.schema';
import { AddUserDto, UpdateUserDto, UpdateProfileDto } from './dto/users.dto';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email?: string;
    role?: string;
  };
}

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('users.create')
  @ApiOperation({ summary: 'Add a new user (Admin)' })
  @Post('addUser')
  async addUser(@Body() body: AddUserDto, @Req() req: AuthenticatedRequest): Promise<Users> {
    return this.usersService.addUser(body.name, body.email, body.password, body.roleId, req.user);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @ApiOperation({ summary: 'Get profile of current logged-in user' })
  @Get('myprofile')
  getMyProfile(@Req() req: AuthenticatedRequest) {
    const user = req.user;
    if (!user?.userId) {
      throw new BadRequestException('User not authenticated');
    }

    return this.usersService.findById(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update profile (name, email, password) of current logged-in user' })
  @ApiOkResponse({ description: 'Profile updated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid input data or current password incorrect' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBody({ type: UpdateProfileDto })
  @Patch('profile')
  updateProfile(@Req() req: AuthenticatedRequest, @Body() dto: UpdateProfileDto) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    return this.usersService.updateProfile(userId, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('users.read')
  @ApiOperation({ summary: 'Fetch all users' })
  @Get('allUsers')
  findAllUsers(@Req() req: AuthenticatedRequest) {
    return this.usersService.findAll(req.user);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('users.read')
  @ApiOperation({ summary: 'Fetch user by ID' })
  @Get('fetch/:id')
  findUserById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('users.update')
  @ApiOperation({ summary: 'Update user by ID (Admin)' })
  @Patch('update/:id')
  updateUser(@Param('id') id: string, @Body() updates: UpdateUserDto, @Req() req: AuthenticatedRequest) {
    return this.usersService.updateUser(id, updates, req.user);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('users.delete')
  @ApiOperation({ summary: 'Delete user by ID (Admin)' })
  @Delete('delete/:id')
  deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}

