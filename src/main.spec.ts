import { BadRequestException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { bootstrap } from './main';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

describe('bootstrap', () => {
  it('registers the global HTTP exception filter during startup', async () => {
    const app = {
      useGlobalPipes: jest.fn(),
      useGlobalFilters: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    } as any;

    const createSpy = jest.spyOn(NestFactory, 'create').mockResolvedValue(app);

    await bootstrap();

    expect(createSpy).toHaveBeenCalledWith(AppModule);
    expect(app.useGlobalFilters).toHaveBeenCalled();
    expect(app.useGlobalFilters).toHaveBeenCalledWith(expect.any(HttpExceptionFilter));
    expect(app.useGlobalPipes).toHaveBeenCalled();

    createSpy.mockRestore();
  });

  it('formats HTTP exceptions consistently through the filter', () => {
    const filter = new HttpExceptionFilter();
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const request = {
      url: '/users',
      method: 'GET',
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    };

    filter.catch(new BadRequestException('bad input'), host as any);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        path: '/users',
        method: 'GET',
        error: 'bad input',
      }),
    );
  });
});
