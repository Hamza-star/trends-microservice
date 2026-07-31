import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto, LoginDto } from './dtos/auth.dtos';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { JwtAuthGuard } from './jwt.authguard';

interface AuthenticatedRequest extends Request {
  user?: {
    userId?: string;
  };
}

@Controller('auth')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({
    default: {
      limit: 20,
      ttl: 60000,
    },
  })
  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto.email, dto.password);
  }

  @Throttle({
    default: {
      limit: 5,
      ttl: 60000,
    },
  })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto.email, dto.password, dto.timezone);

    response.cookie('refreshToken', result.refreshToken, this.refreshTokenCookieOptions);

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.refreshToken;
    const tokens = await this.authService.refreshTokens(refreshToken);

    response.cookie('refreshToken', tokens.refreshToken, this.refreshTokenCookieOptions);

    return {
      accessToken: tokens.accessToken,
    };
  }

  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(request.cookies?.refreshToken);
    response.clearCookie('refreshToken', this.refreshTokenCookieOptions);

    return { message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  async logoutAllDevices(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const userId = request.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const revokedSessions = await this.authService.logoutAllDevices(userId);
    response.clearCookie('refreshToken', this.refreshTokenCookieOptions);

    return {
      message: 'Logged out from all devices successfully',
      revokedSessions,
    };
  }

  private readonly refreshTokenCookieOptions: CookieOptions = {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}
