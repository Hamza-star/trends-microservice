import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getConnectionToken } from '@nestjs/mongoose';
import { TrendsService } from './trends.service';

describe('TrendsService', () => {
  let service: TrendsService;
  let connection: { collection: jest.Mock };
  let configService: { getOrThrow: jest.Mock };

  beforeEach(async () => {
    connection = {
      collection: jest.fn().mockReturnValue({
        aggregate: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
      }),
    };
    configService = {
      getOrThrow: jest.fn().mockReturnValue({
        projectCollections: {
          'project-a': ['zone_1'],
          'project-b': ['zone_2', 'zone_3'],
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
      ['meter-1'],
      ['suffix'],
      'UTC',
      'project-b',
    );

    expect(connection.collection).toHaveBeenCalledTimes(2);
    expect(connection.collection).toHaveBeenNthCalledWith(1, 'zone_2');
    expect(connection.collection).toHaveBeenNthCalledWith(2, 'zone_3');
  });
});
