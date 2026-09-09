import { buildtrendsAggregationPipeline } from './trends-aggregation';

describe('buildtrendsAggregationPipeline', () => {
  it('normalizes BSON dates and ISO timestamp strings before matching', () => {
    const pipeline = buildtrendsAggregationPipeline(
      ['meter-1'],
      ['AMP_AVG'],
      '2026-06-01',
      '2026-06-01',
      '06:00:00',
      '18:00:00',
      'zone_1',
      'Asia/Karachi',
    );

    expect(pipeline[0]).toEqual({
      $set: {
        normalizedTimestamp: {
          $convert: {
            input: '$timestamp',
            to: 'date',
            onError: null,
            onNull: null,
          },
        },
      },
    });
    expect(pipeline[1]).toEqual({
      $match: expect.objectContaining({
        normalizedTimestamp: expect.objectContaining({ $ne: null }),
      }),
    });
    expect(pipeline[2].$project.timestamp).toEqual({
      $dateToString: expect.objectContaining({ date: '$normalizedTimestamp' }),
    });
  });
});