import { TrendsCacheService } from './trends-cache.service';

describe('TrendsCacheService', () => {
  it('uses the same key when meter and suffix order differs', () => {
    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    };
    const cache = new TrendsCacheService(configService as any);

    const firstKey = cache.createKey({
      projectId: 'project-a',
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      startTime: '00:00:00',
      endTime: '23:59:59',
      meterIds: ['meter-b', 'meter-a'],
      suffixes: ['TEMP', 'AMP'],
      userTimezone: 'UTC',
      useSixThirtyWindow: true,
    });
    const secondKey = cache.createKey({
      projectId: 'project-a',
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      startTime: '00:00:00',
      endTime: '23:59:59',
      meterIds: ['meter-a', 'meter-b'],
      suffixes: ['AMP', 'TEMP'],
      userTimezone: 'UTC',
      useSixThirtyWindow: true,
    });

    expect(firstKey).toBe(secondKey);
  });

  it('stores and retrieves a trends result', () => {
    const configService = { get: jest.fn().mockReturnValue(undefined) };
    const cache = new TrendsCacheService(configService as any);
    const result = { timezone: 'UTC', data: [{ timestamp: '2026-01-01T00:00:00' }] };

    cache.set('key', result);

    expect(cache.get('key')).toEqual(result);
  });
});