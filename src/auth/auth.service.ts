import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';
import { ServiceCredential } from './auth.config';

@Injectable()
export class AuthService {
  private readonly serviceCredentials: ServiceCredential[];

  constructor(configService: ConfigService) {
    this.serviceCredentials = configService.getOrThrow<ServiceCredential[]>(
      'auth.serviceTokens',
    );
  }

  resolveProject(token: string): string | undefined {
    const credential = this.serviceCredentials.find(({ token: configuredToken }) =>
      this.tokensMatch(token, configuredToken),
    );

    return credential?.project;
  }

  private tokensMatch(candidate: string, configuredToken: string): boolean {
    const candidateHash = createHash('sha256').update(candidate).digest();
    const configuredTokenHash = createHash('sha256').update(configuredToken).digest();

    return timingSafeEqual(candidateHash, configuredTokenHash);
  }
}