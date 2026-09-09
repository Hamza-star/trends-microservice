import { ValidationPipe } from '@nestjs/common';
import { validate } from 'class-validator';
import { GetTrendsDto } from './get-trends.dto';

describe('GetTrendsDto', () => {
  it('requires a non-empty projectId', async () => {
    const dto = Object.assign(new GetTrendsDto(), {
      start_date: '2026-06-01',
      end_date: '2026-06-01',
      start_time: '00:00:00',
      end_time: '23:59:59',
      meterIds: ['meter-1'],
      suffixes: ['AMP_AVG'],
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'projectId')).toBe(true);
  });

  it('rejects client database and collection fields through the global validation policy', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    await expect(
      pipe.transform(
        {
          projectId: 'ems',
          start_date: '2026-06-01',
          end_date: '2026-06-01',
          start_time: '00:00:00',
          end_time: '23:59:59',
          meterIds: ['meter-1'],
          suffixes: ['AMP_AVG'],
          dbName: 'client-db',
          collections: ['client-collection'],
        },
        { type: 'body', metatype: GetTrendsDto },
      ),
    ).rejects.toThrow();
  });
});