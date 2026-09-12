import { describe, expect, it } from '@jest/globals';
import { ConfigCacheService } from './config-cache.service';

describe('ConfigCacheService', () => {
  it('gets, sets, and invalidates project configuration', () => {
    const cache = new ConfigCacheService();
    const config = {
      projectId: 'ems',
      databaseName: 'ems_db',
      nodeRedUrls: ['http://localhost:1880'],
      collections: ['zone_1'],
    };

    expect(cache.get('ems')).toBeUndefined();
    cache.set('ems', config);
    expect(cache.get('ems')).toEqual(config);
    cache.invalidate('ems');
    expect(cache.get('ems')).toBeUndefined();
  });
});