import { describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProjectConfigService } from './project-config.service';

describe('ProjectConfigService', () => {
  it('loads active project configuration and active collections', async () => {
    const projectModel = {
      findOne: jest.fn().mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({
          projectId: 'ems',
          databaseName: 'ems_db',
          isActive: true,
        }) }),
      }),
    };
    const collectionModel = {
      find: jest.fn().mockReturnValue({
        select: () => ({
          lean: () => ({ exec: jest.fn().mockResolvedValue([
            { collectionName: 'zone_1' },
            { collectionName: 'zone_2' },
          ]) }),
        }),
      }),
    };
    const connection = {
      useDb: jest.fn().mockReturnValue({ models: {
        Project: projectModel,
        ProjectCollection: collectionModel,
      } }),
    };
    const configService = {
      getOrThrow: jest.fn().mockReturnValue('trends_config'),
    };
    const cache = {
      get: jest.fn().mockReturnValue(undefined),
      set: jest.fn(),
    };
    const service = new ProjectConfigService(
      connection as any,
      configService as any,
      cache as any,
    );

    await expect(service.getProjectConfig('ems')).resolves.toEqual({
      projectId: 'ems',
      databaseName: 'ems_db',
      collections: ['zone_1', 'zone_2'],
    });
    expect(cache.set).toHaveBeenCalled();
  });

  it('rejects an unknown project', async () => {
    const service = new ProjectConfigService(
      { useDb: () => ({ models: { Project: { findOne: () => ({ lean: () => ({ exec: jest.fn().mockResolvedValue(null) }) }) } } }) } as any,
      { getOrThrow: jest.fn().mockReturnValue('trends_config') } as any,
      { get: jest.fn().mockReturnValue(undefined) } as any,
    );

    await expect(service.getProjectConfig('missing')).rejects.toThrow(NotFoundException);
  });

  it('rejects an inactive project', async () => {
    const service = new ProjectConfigService(
      { useDb: () => ({ models: { Project: { findOne: () => ({ lean: () => ({ exec: jest.fn().mockResolvedValue({ isActive: false }) }) }) } } }) } as any,
      { getOrThrow: jest.fn().mockReturnValue('trends_config') } as any,
      { get: jest.fn().mockReturnValue(undefined) } as any,
    );

    await expect(service.getProjectConfig('inactive')).rejects.toThrow(ForbiddenException);
  });
});