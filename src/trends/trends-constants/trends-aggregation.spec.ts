import { buildtrendsAggregationPipeline } from './trends-aggregation';

describe('buildtrendsAggregationPipeline', () => {
  it('normalizes top-level timestamps and metrics before matching', () => {
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

    expect(pipeline[0].$set.normalizedTimestamp).toEqual({
      $convert: {
        input: { $ifNull: ['$timestamp', '$payload.Time'] },
        to: 'date',
        onError: null,
        onNull: null,
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
    expect(pipeline[2].$project['meter-1_AMP_AVG']).toEqual({
      $ifNull: ['$meter-1_AMP_AVG', '$payload.meter-1_AMP_AVG'],
    });
  });

  it('supports payload.Time and payload-nested metric fields', () => {
    const pipeline = buildtrendsAggregationPipeline(
      ['BL'],
      ['Setting_HMI'],
      '2025-09-29',
      '2025-09-29',
      '00:00:00',
      '23:59:59',
      'zone_1',
      'Asia/Karachi',
    );

    expect(pipeline[0].$set.normalizedTimestamp.$convert.input).toEqual({
      $ifNull: ['$timestamp', '$payload.Time'],
    });
    expect(pipeline[2].$project['BL_Setting_HMI']).toEqual({
      $ifNull: ['$BL_Setting_HMI', '$payload.BL_Setting_HMI'],
    });
  });
});