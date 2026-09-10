import { Injectable } from '@nestjs/common';
import type { ProjectConfig } from './project-config.service';

interface CacheEntry {
  value: ProjectConfig;
  expiresAt: number;
}

@Injectable()
export class ConfigCacheService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs = 60_000;

  get(projectId: string): ProjectConfig | undefined {
    const entry = this.cache.get(projectId);

    if (!entry || entry.expiresAt <= Date.now()) {
      this.cache.delete(projectId);
      return undefined;
    }

    return entry.value;
  }

  set(projectId: string, value: ProjectConfig): void {
    this.cache.set(projectId, { value, expiresAt: Date.now() + this.ttlMs });
  }

  invalidate(projectId: string): void {
    this.cache.delete(projectId);
  }

  clear(): void {
    this.cache.clear();
  }
}