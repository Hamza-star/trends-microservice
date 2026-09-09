import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

export interface ServiceRequest {
  headers: { authorization?: string | string[] };
  service?: { project: string };
  user?: { timezone?: string };
  body?: unknown;
}

@Injectable()
export class ServiceAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<ServiceRequest>();
    const authorization = request.headers.authorization;

    if (typeof authorization !== 'string') {
      throw new UnauthorizedException('Unauthorized');
    }

    const match = /^Bearer\s+(\S+)$/i.exec(authorization);
    const project = match ? this.authService.resolveProject(match[1]) : undefined;

    if (!project) {
      throw new UnauthorizedException('Unauthorized');
    }

    request.service = { project };
    return true;
  }
}