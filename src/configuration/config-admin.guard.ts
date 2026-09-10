import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';

@Injectable()
export class ConfigAdminGuard implements CanActivate {
  private readonly adminToken: string;

  constructor(configService: ConfigService) {
    this.adminToken = configService.getOrThrow<string>('configuration.adminToken');
  }

  canActivate(context: ExecutionContext): boolean {
    const authorization = context.switchToHttp().getRequest<{ headers: { authorization?: string } }>()
      .headers.authorization;
    const match = typeof authorization === 'string'
      ? /^Bearer\s+(\S+)$/i.exec(authorization)
      : undefined;

    if (!match || !this.tokensMatch(match[1])) {
      throw new UnauthorizedException('Unauthorized');
    }

    return true;
  }

  private tokensMatch(candidate: string): boolean {
    const candidateHash = createHash('sha256').update(candidate).digest();
    const configuredHash = createHash('sha256').update(this.adminToken).digest();
    return timingSafeEqual(candidateHash, configuredHash);
  }
}