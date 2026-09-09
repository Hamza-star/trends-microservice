import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getConnectionToken } from '@nestjs/mongoose';
import { TrendsService } from './trends.service';

describe('TrendsService', () => {
  let service: TrendsService;
  let database: { collection: jest.Mock };
  let connection: { useDb: jest.Mock };
  let configService: { getOrThrow: jest.Mock };

  beforeEach(async () => {
    database = {
      collection: jest.fn().mockReturnValue({
        aggregate: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
      }),
    };
    connection = {
      useDb: jest.fn().mockReturnValue(database),
    };
    configService = {
      getOrThrow: jest.fn().mockReturnValue({
        projectCollections: {
          'project-a': ['zone_1'],
          'project-b': ['zone_2', 'zone_3'],
        },
        projects: {
          ems: { dbName: 'ems_db', collections: ['zone_1'] },
          solar: { dbName: 'solar_db', collections: ['zone_2', 'zone_3'] },
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrendsService,
        { provide: getConnectionToken(), useValue: connection },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<TrendsService>(TrendsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('queries only the collections configured for the authenticated project', async () => {
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
    ).rejects.toThrow('Unknown projectId');
  });
});
