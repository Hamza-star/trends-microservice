import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { TrendsService } from './trends.service';
import { TrendsCacheService } from './trends-cache.service';
import { ProjectConfigService } from '../configuration/project-config.service';

describe('TrendsService', () => {
  let service: TrendsService;
  let database: { collection: jest.Mock };
  let connection: { useDb: jest.Mock };
  let projectConfigService: { getProjectConfig: jest.Mock };
  let trendsCacheService: { createKey: jest.Mock; get: jest.Mock; set: jest.Mock };

  beforeEach(async () => {
    database = {
      collection: jest.fn().mockReturnValue({
        aggregate: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
      }),
    };
    connection = {
      useDb: jest.fn().mockReturnValue(database),
    };
    projectConfigService = {
      getProjectConfig: jest.fn().mockResolvedValue({
        projectId: 'solar',
        databaseName: 'solar_db',
        collections: ['zone_2', 'zone_3'],
      }),
    };
    trendsCacheService = {
      createKey: jest.fn().mockReturnValue('trends-cache-key'),
      get: jest.fn().mockReturnValue(undefined),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrendsService,
        { provide: getConnectionToken(), useValue: connection },
        { provide: ProjectConfigService, useValue: projectConfigService },
        { provide: TrendsCacheService, useValue: trendsCacheService },
      ],
    }).compile();

    service = module.get<TrendsService>(TrendsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('queries only the collections configured for the resolved project', async () => {
    await service.getTrendsByMeters(
      '2026-01-01',
      '2026-01-02',
      '00:00:00',
      '23:59:59',
      ['meter-1'],
      ['suffix'],
      'UTC',
      'solar',
    );

    expect(connection.useDb).toHaveBeenCalledWith('solar_db', { useCache: true });
    expect(database.collection).toHaveBeenCalledTimes(2);
    expect(database.collection).toHaveBeenNthCalledWith(1, 'zone_2');
    expect(database.collection).toHaveBeenNthCalledWith(2, 'zone_3');
  });

  it('rejects an unknown projectId', async () => {
    projectConfigService.getProjectConfig.mockRejectedValue(new NotFoundException('Project not found'));

    await expect(
      service.getTrendsByMeters(
        '2026-01-01',
        '2026-01-02',
        '00:00:00',
        '23:59:59',
        ['meter-1'],
        ['suffix'],
        'UTC',
        'unknown',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('returns cached results without querying MongoDB', async () => {
    const cachedResult = { timezone: 'UTC', data: [{ timestamp: 'cached' }] };
    trendsCacheService.get.mockReturnValue(cachedResult);

    await expect(
      service.getTrendsByMeters(
        '2026-01-01',
        '2026-01-02',
        '00:00:00',
        '23:59:59',
        ['meter-1'],
        ['suffix'],
        'UTC',
        'solar',
      ),
    ).resolves.toEqual(cachedResult);

    expect(projectConfigService.getProjectConfig).not.toHaveBeenCalled();
    expect(database.collection).not.toHaveBeenCalled();
  });
});
