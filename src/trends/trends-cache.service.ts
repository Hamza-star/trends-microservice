import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LRUCache } from 'lru-cache';

export interface TrendsResult {
  timezone: string;
  data: any[];
}

export interface TrendsCacheKeyInput {
  projectId: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  meterIds: string[];
  suffixes: string[];
  userTimezone: string;
  useSixThirtyWindow: boolean;
}

@Injectable()
export class TrendsCacheService {
  private readonly cache: LRUCache<string, TrendsResult>;

  constructor(private readonly configService: ConfigService) {
    const max = this.getPositiveNumber('TRENDS_CACHE_MAX_ITEMS', 100);
    const ttl = this.getPositiveNumber('TRENDS_CACHE_TTL_SECONDS', 60) * 1000;

    this.cache = new LRUCache<string, TrendsResult>({
      max,
      ttl,
    });
  }

  createKey(input: TrendsCacheKeyInput): string {
    return `trends:v1:${JSON.stringify({
      ...input,
      meterIds: [...input.meterIds].sort(),
      suffixes: [...input.suffixes].sort(),
    })}`;
  }

  get(key: string): TrendsResult | undefined {
    return this.cache.get(key);
  }

  set(key: string, value: TrendsResult): void {
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  private getPositiveNumber(name: string, fallback: number): number {
    const value = Number(this.configService.get<string>(name) ?? fallback);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
}