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
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt.authguard';
import { AdminGuard } from '../auth/roles.authguard';
import type { Request } from 'express';
import { Users } from './schema/users.schema';
import { AddUserDto, UpdateUserDto } from './dto/users.dto';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email?: string;
    role?: string;
  };
}

@Controller('users')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Post('addUser')
  async addUser(@Body() body: AddUserDto): Promise<Users> {
    return this.usersService.addUser(body.name, body.email, body.password, body.roleId);
  }
  @UseGuards(JwtAuthGuard)
  @Get('myprofile')
  getMyProfile(@Req() req: AuthenticatedRequest) {
    const user = req.user;
    if (!user?.userId) {
      throw new BadRequestException('User not authenticated');
    }

    return this.usersService.findById(user.userId);
  }

  
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('allUsers')
  findAllUsers() {
    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('fetch/:id')
  findUserById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('update/:id')
  updateUser(@Param('id') id: string, @Body() updates: UpdateUserDto) {
    return this.usersService.updateUser(id, updates);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete('delete/:id')
  deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}
